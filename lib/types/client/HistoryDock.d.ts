/**
 * HistoryDock — invisible dock entry that collects prompt history and
 * drives terminal-style navigation over the composer.
 *
 * Registers as a `conversation.composer.dock` list entry and renders an
 * `aria-hidden` anchor (zero layout footprint). This component owns both
 * plugin behaviors, because both need per-Session machine faces that only
 * session-scoped slot components receive (rc.1: the dock slot no longer
 * carries an `InputZone` owner — `input` is read through the standard
 * `useInput` selector hook, alongside `useChat`/`inputActions`):
 *
 *   - **Collection**: every Chat update re-reads the legacy node slice via
 *     `useChat` and appends the latest user/steering text to the shared
 *     `HistoryStore` (the store dedupes, so repeated appends are no-ops).
 *   - **Navigation**: a capture-phase document `keydown` listener. Capture
 *     is required because the composer is a Lexical contenteditable — its
 *     keymap moves the caret synchronously in JS on the editable element,
 *     so a bubble-phase listener would observe the keystroke only after the
 *     caret already moved. The listener intercepts ArrowUp/ArrowDown before
 *     Lexical, replaces the draft through `inputActions.setDraft` (the
 *     public machine action — no DOM writes), and consumes the event.
 *
 * The dock is session-scoped and DSH suppresses it in hero/blank mode, so
 * neither behavior runs without an active session — and navigation could
 * not run there anyway: the input machine (and `inputActions`) exists only
 * for a current session.
 *
 * @module @huanlin/dsh-plugin-input-history/client/HistoryDock
 */
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { HistoryStore } from './history.ts';
/** Full props: dock runtime share (standard kit — rc.1 removed the InputZone owner) + locale seat. */
type HistoryDockProps = PropsRuntime<'conversation.composer.dock'> & PropsLocale<'dsh-plugin-input-history'>;
/** Get the shared history store (initializes lazily on first call). */
export declare function getHistoryStore(): HistoryStore;
/**
 * Render the invisible history dock entry: collection + navigation.
 *
 * @param props - dock runtime share (standard hooks) + locale seat.
 * @returns an `aria-hidden` anchor with zero layout footprint.
 */
export declare function HistoryDock({ useInput, useChat, inputActions, sessionId }: HistoryDockProps): import("react").JSX.Element;
export {};
