/**
 * dsh-plugin-input-history — browser half.
 *
 * One registration: the `conversation.composer.dock` list slot (id
 * `dsh-plugin-input-history`, order 100) mounts the invisible dock entry
 * that owns both plugin behaviors — prompt-history collection from the
 * Chat target's user/steering nodes, and the capture-phase document
 * keydown listener that navigates the composer draft through
 * `inputActions.setDraft`. See [HistoryDock.tsx](./HistoryDock.tsx) for
 * the data flow; the dock is session-scoped, so in hero/blank mode the
 * plugin is dormant (no input machine exists there to drive).
 *
 * History is collected from `user` and `steering` chat nodes of any active
 * session, persisted to `localStorage` (FIFO, 500 entries), and shared
 * across all sessions in the same browser profile.
 *
 * @module @huanlin/dsh-plugin-input-history/client
 */
import type { Context } from '@deepseek-ai/cordis';
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
 * Client plugin body: register the dock + locale dictionaries.
 *
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
