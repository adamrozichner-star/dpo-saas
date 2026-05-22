// Regulatory scraper: fetch + retry + polite delay + robots.txt awareness.
// Implements fetchDocument() per the ingest-worker contract.
//
// Behavior:
//   - 30s per-request timeout (AbortController)
//   - 3 retries with exponential backoff (1s, 4s, 16s) on 429/503/network
//   - 2s polite delay between requests to the SAME domain (cross-process
//     order is undefined; same-process bursts get throttled)
//   - robots.txt fetched once per domain per process, cached
//   - Structured console events at every state transition

import { createHash } from 'crypto';

export interface FetchResult {
  url: string;          // final URL after redirects
  fetchedAt: string;
  status: number;
  contentType: string | null;
  rawHtml: string;
  contentHash: string;  // SHA256 of normalized plain text (caller-derived elsewhere; here we hash raw HTML as a coarse signal)
}

const USER_AGENT = 'DeepoBot/1.0 (https://deepo.co.il; compliance@deepo.co.il)';
const REQUEST_TIMEOUT_MS = 30_000;
const BACKOFF_MS = [1_000, 4_000, 16_000];
const POLITE_DELAY_MS = 2_000;

// Per-process caches. State doesn't survive across function invocations on
// Vercel, which is fine — fresh per ingest run.
const lastFetchByHost = new Map<string, number>();
const robotsCache = new Map<string, RobotsRules | 'allow_all' | 'fetch_failed'>();

interface RobotsRules {
  disallowPaths: string[];
}

function logEvent(event: string, fields: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...fields }));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hostOf(url: string): string {
  return new URL(url).host;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        ...init?.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function loadRobots(host: string): Promise<RobotsRules | 'allow_all' | 'fetch_failed'> {
  const cached = robotsCache.get(host);
  if (cached !== undefined) return cached;
  const robotsUrl = `https://${host}/robots.txt`;
  try {
    const res = await fetchWithTimeout(robotsUrl);
    if (!res.ok) {
      // 404 etc. → treat as no rules
      robotsCache.set(host, 'allow_all');
      return 'allow_all';
    }
    const text = await res.text();
    const rules = parseRobots(text);
    robotsCache.set(host, rules);
    return rules;
  } catch (err) {
    logEvent('robots_fetch_failed', { host, error: err instanceof Error ? err.message : String(err) });
    robotsCache.set(host, 'fetch_failed');
    return 'fetch_failed';
  }
}

// Minimal robots.txt parser: collects Disallow paths for User-agent: *
// blocks. Doesn't handle Allow overrides or multi-UA precedence — sufficient
// for the polite-citizen check we want.
function parseRobots(text: string): RobotsRules {
  const lines = text.split('\n').map(l => l.replace(/#.*$/, '').trim()).filter(Boolean);
  const disallow: string[] = [];
  let inStarBlock = false;
  for (const line of lines) {
    const [keyRaw, ...rest] = line.split(':');
    const key = keyRaw.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      inStarBlock = value === '*';
      continue;
    }
    if (!inStarBlock) continue;
    if (key === 'disallow' && value) disallow.push(value);
  }
  return { disallowPaths: disallow };
}

function robotsAllows(url: string, rules: RobotsRules | 'allow_all' | 'fetch_failed'): boolean {
  if (rules === 'allow_all' || rules === 'fetch_failed') return true;
  const path = new URL(url).pathname;
  return !rules.disallowPaths.some(p => path.startsWith(p));
}

async function applyPoliteDelay(host: string): Promise<void> {
  const last = lastFetchByHost.get(host);
  if (last !== undefined) {
    const elapsed = Date.now() - last;
    if (elapsed < POLITE_DELAY_MS) {
      const wait = POLITE_DELAY_MS - elapsed;
      logEvent('polite_delay', { host, waitMs: wait });
      await sleep(wait);
    }
  }
  lastFetchByHost.set(host, Date.now());
}

export async function fetchDocument(url: string): Promise<FetchResult> {
  const host = hostOf(url);

  // Politeness check first
  const robots = await loadRobots(host);
  if (!robotsAllows(url, robots)) {
    const msg = `robots.txt disallows: ${url}`;
    logEvent('fetch_blocked_by_robots', { url, host });
    throw new Error(msg);
  }

  logEvent('fetch_start', { url, host });

  for (let attempt = 1; attempt <= BACKOFF_MS.length + 1; attempt++) {
    await applyPoliteDelay(host);
    try {
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        const rawHtml = await res.text();
        const result: FetchResult = {
          url: res.url || url,
          fetchedAt: new Date().toISOString(),
          status: res.status,
          contentType: res.headers.get('content-type'),
          rawHtml,
          contentHash: createHash('sha256').update(rawHtml).digest('hex'),
        };
        logEvent('fetch_success', { url, finalUrl: result.url, status: res.status, bytes: rawHtml.length, attempt });
        return result;
      }
      if (isRetryableStatus(res.status) && attempt <= BACKOFF_MS.length) {
        const wait = BACKOFF_MS[attempt - 1];
        logEvent('fetch_retry', { url, status: res.status, attempt, waitMs: wait });
        await sleep(wait);
        continue;
      }
      const errBody = await res.text().catch(() => '');
      const msg = `HTTP ${res.status} fetching ${url}: ${errBody.slice(0, 200)}`;
      logEvent('fetch_failed', { url, status: res.status, attempt });
      throw new Error(msg);
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const transient = isAbort || (err instanceof TypeError); // network errors
      if (transient && attempt <= BACKOFF_MS.length) {
        const wait = BACKOFF_MS[attempt - 1];
        logEvent('fetch_retry', { url, error: err instanceof Error ? err.message : String(err), attempt, waitMs: wait });
        await sleep(wait);
        continue;
      }
      logEvent('fetch_failed', { url, error: err instanceof Error ? err.message : String(err), attempt });
      throw err;
    }
  }
  // Unreachable in practice — loop returns or throws within the body.
  throw new Error(`fetchDocument: exhausted retries for ${url}`);
}
