/**
 * HistoryDock — invisible dock entry that collects prompt history.
 *
 * Registers as a `conversation.composer.dock` list entry and renders an
 * `aria-hidden` anchor (zero layout footprint). The dock's only job is
 * history collection: every render reads `props.session.nodes` and
 * appends new user/steering text to the module-scope `HistoryStore`.
 *
 * The keydown listener that drives navigation lives in `apply` (module
 * scope), NOT in this dock — because the dock is session-scoped and
 * DSH treats blank sessions as "hero" (ConversationRoot.tsx:79-80),
 * which suppresses the dock entirely (`!hero` guard at line 156).
 * Moving the listener to `apply` ensures it is always attached,
 * regardless of hero/blank/active session state.
 *
 * @module @huanlin/dsh-plugin-input-history/client/HistoryDock
 */
import type { PropsRuntime, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { HistoryStore } from './history.ts';
/** Full props: dock runtime share + locale seat. */
type HistoryDockProps = PropsRuntime<'conversation.composer.dock'> & PropsLocale<'dsh-plugin-input-history'>;
/** Get the shared history store (initializes lazily on first call). */
export declare function getHistoryStore(): HistoryStore;
/**
 * Render the invisible history-collection dock entry.
 *
 * @param props - dock runtime share (InputZone owner + session kit) + locale seat.
 * @returns an `aria-hidden` anchor with zero layout footprint.
 */
export declare function HistoryDock({ session }: HistoryDockProps): import("react").JSX.Element;
export {};
