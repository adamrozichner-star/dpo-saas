// Skill registry — single source of truth for the Claude tools the runtime
// exposes to every agent invocation. Domain-specific skills (cameras, ROPA,
// incidents, etc.) will be added here in later phases.

import { readOrgFacts, writeOrgFact } from './facts';
import { readScratchpad, writeScratchpad } from './scratchpad';
import { createNotification } from './notifications';
import type { AnySkill, SkillInputSchema } from './types';

export const SKILLS_REGISTRY: Record<string, AnySkill> = {
  read_org_facts: readOrgFacts,
  write_org_fact: writeOrgFact,
  read_scratchpad: readScratchpad,
  write_scratchpad: writeScratchpad,
  create_notification: createNotification,
};

export interface ToolDefinitionForClaude {
  name: string;
  description: string;
  input_schema: SkillInputSchema;
}

export function getToolDefinitions(): ToolDefinitionForClaude[] {
  return Object.values(SKILLS_REGISTRY).map(skill => ({
    name: skill.definition.name,
    description: skill.definition.description,
    input_schema: skill.definition.input_schema,
  }));
}

export function getSkill(name: string): AnySkill | null {
  return SKILLS_REGISTRY[name] ?? null;
}

export type { Skill, AnySkill } from './types';
export type { SkillContext, SkillDefinition, SkillHandler, SkillInputSchema } from './types';
