/**
 * dsh-plugin-input-history — host plugin entry.
 *
 * Client-only plugin: the host half has no runtime work. The browser half
 * (`./client`) registers an invisible entry in `conversation.composer.dock`
 * that collects prompt history from the Chat target's user/steering nodes
 * and implements terminal-style history navigation (ArrowUp/ArrowDown) over
 * the composer's Lexical surface through `inputActions.setDraft`.
 *
 * History is collected from `user` and `steering` chat nodes of any active
 * session, persisted to `localStorage` (FIFO, capacity 500), and shared
 * across all sessions in the same browser profile.
 *
 * @module @huanlin/dsh-plugin-input-history
 */
export const name = 'dsh-plugin-input-history';
export const inject = [];
/**
 * Host apply — no-op. The history navigation is a pure client-side UI
 * contribution; no host-side resources are used.
 * @param _ctx - host context (unused).
 */
export function apply(_ctx) {
    // Client-only plugin: all work happens in src/client/index.ts.
}
