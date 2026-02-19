// src/lib/api-utils.ts
// Shared utilities for API routes

import { randomBytes } from 'crypto'

/**
 * HTML-escape user-provided strings before injecting into email templates.
 * Prevents XSS via email content injection.
 */
export function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generate a cryptographically secure session token.
 * Uses Node.js crypto.randomBytes instead of Math.random().
 */
export function generateSecureToken(prefix = 'dpo_', length = 32): string {
  return prefix + randomBytes(length).toString('hex')
}

/**
 * Truncate string safely (for logging, descriptions)
 */
export function truncate(str: string, max = 500): string {
  if (!str) return ''
  return str.length > max ? str.substring(0, max) + '...' : str
}
