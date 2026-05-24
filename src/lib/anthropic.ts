// Single chokepoint for Claude API calls. Every Anthropic call in the app
// should route through createMessage() or streamMessage() — no direct
// new Anthropic() / messages.create() in route handlers.
//
// Responsibilities:
//   1. In-process concurrency cap (5 in-flight)
//   2. Retry on 429 / 529 / 5xx / network errors (3 attempts, 1s/2s/4s backoff)
//   3. 60s per-attempt timeout
//   4. Sentry breadcrumbs on every call, captureException on terminal failure
//   5. Warn on large calls (>10k total tokens)
//
// Migration is incremental: only chat/route.ts and chat/stream/route.ts use
// this today. The other 15 call sites get migrated in follow-up PRs.

import Anthropic, { APIError } from '@anthropic-ai/sdk';
import type {
  Message,
  MessageCreateParamsNonStreaming,
  MessageStreamParams,
} from '@anthropic-ai/sdk/resources/messages';
import type { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream';
import type {
  MessageCreateParamsNonStreaming as ToolsMessageCreateParamsNonStreaming,
  ToolsBetaMessage,
} from '@anthropic-ai/sdk/resources/beta/tools/messages';
import * as Sentry from '@sentry/nextjs';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

const anthropic = new Anthropic({ apiKey });

const MAX_CONCURRENT = 5;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1000, 2000, 4000];
const TIMEOUT_MS = 60_000;
const LARGE_CALL_TOKEN_THRESHOLD = 10_000;

// In-process semaphore. Each Fluid Compute function instance gets its own
// budget — that's fine; horizontal concurrency is bounded by Vercel.
let inFlight = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight++;
    return Promise.resolve();
  }
  return new Promise(resolve => {
    waiters.push(() => {
      inFlight++;
      resolve();
    });
  });
}

function release(): void {
  inFlight--;
  const next = waiters.shift();
  if (next) next();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function errorStatus(err: unknown): number | undefined {
  if (err instanceof APIError) return err.status;
  return undefined;
}

function isRetryable(err: unknown): boolean {
  if (err instanceof APIError) {
    const status = err.status;
    // status === undefined covers APIConnectionError / timeout — retry those
    if (status === undefined) return true;
    if (status === 429 || status === 529) return true;
    if (status >= 500 && status <= 504) return true;
    return false;
  }
  // Non-APIError thrown (network, abort, unknown) — retry
  return true;
}

interface Telemetry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  attemptCount: number;
  streamed: boolean;
}

function emitBreadcrumb(t: Telemetry): void {
  Sentry.addBreadcrumb({
    category: 'anthropic',
    level: 'info',
    message: `messages.${t.streamed ? 'stream' : 'create'} ok`,
    data: {
      model: t.model,
      input_tokens: t.inputTokens,
      output_tokens: t.outputTokens,
      duration_ms: t.durationMs,
      attempt_count: t.attemptCount,
    },
  });
  const total = t.inputTokens + t.outputTokens;
  if (total > LARGE_CALL_TOKEN_THRESHOLD) {
    console.warn(
      `[anthropic] large call: ${total} tokens (in=${t.inputTokens} out=${t.outputTokens}) model=${t.model}`,
    );
  }
}

// SDK 0.20.x keeps tool-use under the beta namespace
// (anthropic.beta.tools.messages). Same retry / concurrency / Sentry
// machinery as createMessage — different SDK endpoint and a different
// response shape (ToolsBetaMessage with TextBlock | ToolUseBlock content).
// When the SDK ships a stable tools API, this method should converge with
// createMessage; for now they coexist.
export async function createToolMessage(
  params: ToolsMessageCreateParamsNonStreaming,
): Promise<ToolsBetaMessage> {
  await acquire();
  try {
    let attempt = 0;
    let lastErr: unknown;
    while (attempt < MAX_ATTEMPTS) {
      attempt++;
      const startedAt = Date.now();
      try {
        const message = await anthropic.beta.tools.messages.create(params, {
          timeout: TIMEOUT_MS,
        });
        emitBreadcrumb({
          model: params.model,
          inputTokens: message.usage?.input_tokens ?? 0,
          outputTokens: message.usage?.output_tokens ?? 0,
          durationMs: Date.now() - startedAt,
          attemptCount: attempt,
          streamed: false,
        });
        return message;
      } catch (err) {
        lastErr = err;
        if (!isRetryable(err) || attempt >= MAX_ATTEMPTS) break;
        await sleep(BACKOFF_MS[attempt - 1]);
      }
    }
    Sentry.captureException(lastErr, {
      extra: {
        model: params.model,
        attempt_count: attempt,
        last_error_status: errorStatus(lastErr),
        streamed: false,
        endpoint: 'beta.tools.messages',
      },
    });
    throw lastErr;
  } finally {
    release();
  }
}

interface CreateMessageOptions {
  // Override the default retry attempts (MAX_ATTEMPTS = 3). Callers
  // with a tight wall-clock budget (e.g. PDF extraction, which runs
  // inside a 60s Vercel function) should pass `retries: 1` so a hung
  // Anthropic call doesn't chain into 3×60s before surfacing failure.
  retries?: number;
}

export async function createMessage(
  params: MessageCreateParamsNonStreaming,
  options: CreateMessageOptions = {},
): Promise<Message> {
  const maxAttempts = options.retries ?? MAX_ATTEMPTS;
  await acquire();
  try {
    let attempt = 0;
    let lastErr: unknown;
    while (attempt < maxAttempts) {
      attempt++;
      const startedAt = Date.now();
      try {
        const message = await anthropic.messages.create(params, {
          timeout: TIMEOUT_MS,
        });
        emitBreadcrumb({
          model: params.model,
          inputTokens: message.usage?.input_tokens ?? 0,
          outputTokens: message.usage?.output_tokens ?? 0,
          durationMs: Date.now() - startedAt,
          attemptCount: attempt,
          streamed: false,
        });
        return message;
      } catch (err) {
        lastErr = err;
        if (!isRetryable(err) || attempt >= maxAttempts) break;
        await sleep(BACKOFF_MS[attempt - 1]);
      }
    }
    Sentry.captureException(lastErr, {
      extra: {
        model: params.model,
        attempt_count: attempt,
        last_error_status: errorStatus(lastErr),
        streamed: false,
      },
    });
    throw lastErr;
  } finally {
    release();
  }
}

export async function streamMessage(
  params: MessageStreamParams,
): Promise<MessageStream> {
  await acquire();
  let attempt = 0;
  let lastErr: unknown;
  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    const startedAt = Date.now();
    const stream = anthropic.messages.stream(params, { timeout: TIMEOUT_MS });
    try {
      // Wait until either the first stream event arrives (connection
      // established) or the stream errors. on()/off() listeners are
      // non-consuming — the caller can still iterate the stream from the
      // start and call finalMessage() normally.
      await new Promise<void>((resolve, reject) => {
        const onEvent = () => {
          stream.off('streamEvent', onEvent);
          stream.off('error', onError);
          resolve();
        };
        const onError = (err: unknown) => {
          stream.off('streamEvent', onEvent);
          stream.off('error', onError);
          reject(err);
        };
        stream.on('streamEvent', onEvent);
        stream.on('error', onError);
      });

      // Connection established. Attach finalization for telemetry + slot
      // release. We do NOT retry past this point — partial output may have
      // already reached the client.
      stream
        .finalMessage()
        .then(msg => {
          emitBreadcrumb({
            model: params.model,
            inputTokens: msg.usage?.input_tokens ?? 0,
            outputTokens: msg.usage?.output_tokens ?? 0,
            durationMs: Date.now() - startedAt,
            attemptCount: attempt,
            streamed: true,
          });
        })
        .catch(err => {
          Sentry.captureException(err, {
            extra: {
              model: params.model,
              attempt_count: attempt,
              last_error_status: errorStatus(err),
              streamed: true,
              phase: 'mid-stream',
            },
          });
        })
        .finally(release);

      return stream;
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt >= MAX_ATTEMPTS) break;
      await sleep(BACKOFF_MS[attempt - 1]);
    }
  }
  release();
  Sentry.captureException(lastErr, {
    extra: {
      model: params.model,
      attempt_count: attempt,
      last_error_status: errorStatus(lastErr),
      streamed: true,
      phase: 'pre-first-token',
    },
  });
  throw lastErr;
}
