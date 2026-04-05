/**
 * Chat Memory System
 * 
 * Two layers:
 * 1. Conversation summaries — every ~10 messages, summarize the conversation
 *    so we can keep context without sending all raw messages to Claude.
 * 2. Org memory — persistent facts extracted from conversations, onboarding,
 *    ROPA, incidents. These survive across conversations.
 *
 * Context assembly order for Claude:
 *   org profile → top 15 org memory facts → conversation summary → last 8 raw messages
 */

import Anthropic from '@anthropic-ai/sdk'
import { SupabaseClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

// =============================================
// Types
// =============================================
export interface ConversationSummary {
  id: string
  org_id: string
  conversation_id: string
  summary: string
  message_count: number
  created_at: string
  updated_at: string
}

export interface OrgMemoryFact {
  id: string
  org_id: string
  fact: string
  source: string // 'onboarding' | 'chat' | 'ropa' | 'incident' | 'manual'
  created_at: string
}

export interface AssembledContext {
  summary: string | null
  memoryFacts: string[]
  recentMessages: { role: 'user' | 'assistant'; content: string }[]
}

// =============================================
// Constants
// =============================================
const SUMMARY_THRESHOLD = 10 // Summarize every 10 messages
const MAX_RECENT_MESSAGES = 8 // Keep last 8 raw messages
const MAX_MEMORY_FACTS = 15 // Top 15 org facts in context
const SUMMARY_MODEL = 'claude-3-haiku-20240307' // Cheap model for summaries
const SUMMARY_MAX_TOKENS = 500

// =============================================
// Conversation Summarization
// =============================================

/**
 * Generate a summary of conversation messages.
 * Called when message_count crosses a SUMMARY_THRESHOLD boundary.
 */
export async function summarizeConversation(
  messages: { role: string; content: string }[]
): Promise<string> {
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'לקוח' : 'עוזר'}: ${m.content}`)
    .join('\n\n')

  const response = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: SUMMARY_MAX_TOKENS,
    system: `סכם את השיחה הבאה ב-3-5 משפטים בעברית. 
התמקד ב:
- מה הלקוח ביקש/שאל
- מה נעשה (מסמכים שנוצרו, פעולות שבוצעו)
- נושאים פתוחים שעדיין לא טופלו
- מידע חשוב שנלמד על הארגון

כתוב בגוף שלישי. לא תבליטים, רק פסקה רציפה.`,
    messages: [{ role: 'user', content: transcript }]
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

/**
 * Check if we need to summarize, and do it if so.
 * Returns the current summary (existing or newly generated).
 */
export async function maybeUpdateSummary(
  supabase: SupabaseClient,
  orgId: string,
  conversationId: string,
  messageCount: number
): Promise<string | null> {
  // Only summarize at threshold boundaries
  if (messageCount < SUMMARY_THRESHOLD) return null
  if (messageCount % SUMMARY_THRESHOLD !== 0) {
    // Not at a boundary — return existing summary
    try {
      const { data } = await supabase
        .from('chat_conversation_summaries')
        .select('summary')
        .eq('conversation_id', conversationId)
        .single()
      return data?.summary || null
    } catch {
      return null
    }
  }

  // At a boundary — generate new summary
  try {
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!messages || messages.length < SUMMARY_THRESHOLD) return null

    const summary = await summarizeConversation(messages)

    // Upsert summary
    await supabase
      .from('chat_conversation_summaries')
      .upsert({
        org_id: orgId,
        conversation_id: conversationId,
        summary,
        message_count: messageCount,
        updated_at: new Date().toISOString()
      }, { onConflict: 'conversation_id' })

    return summary
  } catch (error) {
    console.error('[MEMORY] Summary generation failed:', error)
    return null
  }
}

// =============================================
// Org Memory Facts
// =============================================

/**
 * Extract and save facts about the org from a conversation exchange.
 * Runs asynchronously after each AI response — doesn't block the response.
 */
export async function extractAndSaveFacts(
  supabase: SupabaseClient,
  orgId: string,
  userMessage: string,
  aiResponse: string
): Promise<void> {
  try {
    const response = await anthropic.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 300,
      system: `Extract organizational facts from this conversation exchange.
Return ONLY a JSON array of strings, each being a fact about the organization.
Facts should be about: data types processed, systems used, employee count, industry details, compliance status, incidents, policies.
If no new facts, return [].
Respond ONLY with the JSON array, no other text.`,
      messages: [{
        role: 'user',
        content: `User: ${userMessage}\n\nAssistant: ${aiResponse}`
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    
    // Parse facts
    let facts: string[] = []
    try {
      const cleaned = text.replace(/```json|```/g, '').trim()
      facts = JSON.parse(cleaned)
    } catch {
      return // Failed to parse, skip
    }

    if (!Array.isArray(facts) || facts.length === 0) return

    // Save new facts (check for duplicates)
    for (const fact of facts.slice(0, 5)) { // Max 5 facts per exchange
      if (typeof fact !== 'string' || fact.length < 5 || fact.length > 500) continue

      // Simple duplicate check
      const { data: existing } = await supabase
        .from('org_memory')
        .select('id')
        .eq('org_id', orgId)
        .ilike('fact', `%${fact.substring(0, 30)}%`)
        .limit(1)

      if (existing && existing.length > 0) continue

      await supabase
        .from('org_memory')
        .insert({ org_id: orgId, fact, source: 'chat' })
    }
  } catch (error) {
    console.error('[MEMORY] Fact extraction failed:', error)
    // Non-blocking — don't throw
  }
}

/**
 * Save facts from onboarding answers.
 * Called once after onboarding completes.
 */
export async function saveOnboardingFacts(
  supabase: SupabaseClient,
  orgId: string,
  answers: Record<string, any>
): Promise<void> {
  const facts: string[] = []

  if (answers.data_types?.length) {
    facts.push(`הארגון מעבד סוגי מידע: ${answers.data_types.join(', ')}`)
  }
  if (answers.employee_count) {
    facts.push(`מספר עובדים: ${answers.employee_count}`)
  }
  if (answers.has_cameras === true || answers.has_cameras === 'true') {
    facts.push('לארגון יש מצלמות אבטחה')
  }
  if (answers.processes_minors === true || answers.processes_minors === 'true') {
    facts.push('הארגון מעבד מידע של קטינים')
  }
  if (answers.shares_data) {
    facts.push(`משתף מידע עם צד שלישי: ${answers.shares_data}`)
  }
  if (answers.database_registered) {
    facts.push(`סטטוס רישום מאגרים: ${answers.database_registered}`)
  }

  for (const fact of facts) {
    try {
      await supabase
        .from('org_memory')
        .insert({ org_id: orgId, fact, source: 'onboarding' })
    } catch {} // Skip duplicates
  }
}

// =============================================
// Context Assembly
// =============================================

/**
 * Assemble the full context for a Claude call.
 * This is the core function that routes use.
 */
export async function assembleContext(
  supabase: SupabaseClient,
  orgId: string,
  conversationId: string
): Promise<AssembledContext> {
  // 1. Get conversation summary
  let summary: string | null = null
  try {
    const { data } = await supabase
      .from('chat_conversation_summaries')
      .select('summary')
      .eq('conversation_id', conversationId)
      .single()
    summary = data?.summary || null
  } catch {} // No summary yet

  // 2. Get org memory facts
  let memoryFacts: string[] = []
  try {
    const { data } = await supabase
      .from('org_memory')
      .select('fact')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(MAX_MEMORY_FACTS)
    memoryFacts = (data || []).map(f => f.fact)
  } catch {} // No facts yet

  // 3. Get recent messages (reduced from 12 to 8 since we have summaries now)
  let recentMessages: { role: 'user' | 'assistant'; content: string }[] = []
  try {
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(MAX_RECENT_MESSAGES)
    recentMessages = (history || [])
      .reverse()
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  } catch {}

  return { summary, memoryFacts, recentMessages }
}

/**
 * Format context for injection into system prompt.
 */
export function formatContextForPrompt(context: AssembledContext): string {
  const parts: string[] = []

  if (context.memoryFacts.length > 0) {
    parts.push(`\n\U0001f9e0 מידע שנלמד על הארגון:\n${context.memoryFacts.map(f => `- ${f}`).join('\n')}`)
  }

  if (context.summary) {
    parts.push(`\n\U0001f4dd סיכום השיחה עד כה:\n${context.summary}`)
  }

  return parts.join('\n')
}
