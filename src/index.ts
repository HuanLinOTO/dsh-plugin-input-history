/**
 * dsh-plugin-input-history — host plugin entry.
 *
 * Client-only plugin: the host half has no runtime work. The browser half
 * (`./client`) registers an invisible entry in `conversation.composer.dock`
 * that attaches a document-level `keydown` listener and implements
 * terminal-style prompt history navigation (ArrowUp/ArrowDown) over the
 * composer textarea.
 *
 * History is collected from `user` and `steering` conversation nodes as
 * they appear in any session's `ConversationSnapshot`, persisted to
 * `localStorage` (FIFO, capacity 500), and shared across all sessions
 * in the same browser profile.
 *
 * @module @huanlin/dsh-plugin-input-history
 */

import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-plugin-input-history'
export const inject: string[] = []

/**
 * Host apply — no-op. The history navigation is a pure client-side UI
 * contribution; no host-side resources are used.
 * @param _ctx - host context (unused).
 */
export function apply(_ctx: Context): void {
  // Client-only plugin: all work happens in src/client/index.ts.
}
