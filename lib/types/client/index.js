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
import { HistoryDock } from "./HistoryDock.js";
import { en, NS, zh } from "./locales.js";
import { dicts } from "./dictionaries.js";
/** Required services: slots + locale. */
export const inject = ['slots', 'locale'];
/**
 * Client plugin body: register the dock + locale dictionaries.
 *
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-plugin-input-history: dictionaries');
    // better-locale override: register the 19-language dicts so a selected
    // override language (with DSH on 'en') replaces the plugin's copy. The
    // service is optional — no better-locale, no dicts.
    // Activation-order-safe: re-check ctx.get('betterLocale') on every locale
    // revision bump (better-locale bumps on activation + override switch).
    ctx.effect(() => {
        let dispose;
        const sync = () => {
            dispose?.();
            dispose = undefined;
            const store = ctx.get('betterLocale');
            if (store !== undefined) {
                dispose = store.register(NS, dicts);
            }
        };
        sync();
        const unsubscribe = ctx.locale.subscribe(sync);
        return () => {
            unsubscribe();
            dispose?.();
        };
    }, 'dsh-plugin-input-history: better-locale override dicts');
    // The dock collects history from the Chat target's nodes and attaches the
    // capture-phase keydown listener. It is session-scoped; in hero/blank mode
    // it is unmounted and the plugin is dormant (no input machine exists there).
    ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'dsh-plugin-input-history',
        order: 100,
        locale: NS,
    }, HistoryDock));
}
