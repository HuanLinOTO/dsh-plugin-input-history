/**
 * dsh-plugin-input-history — browser half.
 *
 * Two registrations:
 *   - `conversation.composer.dock` list slot (id `dsh-plugin-input-history`,
 *     order 100) — renders an invisible anchor that collects history from
 *     `session.nodes` every render. The dock is session-scoped; DSH treats
 *     blank sessions as "hero" and suppresses the dock, so history
 *     collection only runs in active sessions. That is fine: the first
 *     message in a blank session is collected after the session becomes
 *     active (the message makes it non-blank).
 *   - A document-level `keydown` listener attached in `apply` (NOT in the
 *     dock component) — this ensures the listener is always active,
 *     including in hero/blank mode where the dock is suppressed. The
 *     listener uses the native `value` setter + `dispatchEvent('input')`
 *     to feed history text into the textarea, which triggers InputBar's
 *     `onChange` → `keyboard.setDraft` — the same path the user's typing
 *     takes.
 *
 * History is collected from `user` and `steering` conversation nodes as
 * they appear in any session's `ConversationSnapshot`, persisted to
 * `localStorage` (FIFO, 500 entries), and shared across all sessions
 * in the same browser profile.
 *
 * @module @huanlin/dsh-plugin-input-history/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type InputHistoryKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The dock's aria-label + future settings row copy. */
        'dsh-plugin-input-history': InputHistoryKey;
    }
}
/** Required services: slots + locale. */
export declare const inject: string[];
/**
 * Client plugin body: register the dock + attach the keydown listener.
 *
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
