// Inngest entry point for agent invocations. Triggered by the
// 'deepo/agent.invoke' event. The runtime handles all step granularity
// internally — this function is a thin trigger → runtime adapter.

import { inngest } from '@/inngest/client';
import { invokeAgent } from '@/lib/agents/runtime';

const AGENT_INVOKE_EVENT = 'deepo/agent.invoke';

export interface AgentInvokeEventData {
  orgId: string;
  personaSlug: string;
  trigger: {
    type: 'cron' | 'event' | 'user';
    payload?: unknown;
  };
}

export const agentInvoke = inngest.createFunction(
  {
    id: 'agent-invoke',
    name: 'Agent Invoke',
    retries: 3,
    triggers: [{ event: AGENT_INVOKE_EVENT }],
  },
  async ({ event, step }) => {
    const { orgId, personaSlug, trigger } = event.data as AgentInvokeEventData;
    return await invokeAgent({ orgId, personaSlug, trigger, step });
  },
);
