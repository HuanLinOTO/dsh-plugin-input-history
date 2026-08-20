/**
 * DOM helpers for the composer textarea.
 *
 * The DSH InputBar's textarea is not exposed through any public API —
 * plugins cannot obtain a React ref or a slot-currency handle to it.
 * The two operations this plugin needs (locate the textarea, decide
 * whether the caret is on the first/last line of a multi-line draft) are
 * pure functions over DOM and string state, kept here for unit testing.
 *
 * The locator queries the stable (but undocumented) `data-composer-card`
 * attribute on the composer card root (`InputBar.tsx:629`) and returns
 * the descendant `<textarea>`. The attribute is internal to
 * `@deepseek-ai/dsh-client-ui-conversation` and may change across
 * upstream versions; the locator is the single point to update.
 *
 * @module @huanlin/dsh-plugin-input-history/client/dom
 */
/** Caret line information for a multi-line textarea value. */
export interface CursorLineInfo {
    /** 0-based index of the line the caret is on. */
    readonly currentLine: number;
    /** Total number of lines in the value (>= 1). */
    readonly totalLines: number;
    /** True when the caret is collapsed and on the first line. */
    readonly atFirstLine: boolean;
    /** True when the caret is collapsed and on the last line. */
    readonly atLastLine: boolean;
}
/**
 * Compute the caret's line position in a textarea value.
 *
 * Lines are split on `\n` (the textarea's own line break character). The
 * caret must be collapsed (`selectionStart === selectionEnd`) for the
 * `atFirstLine` / `atLastLine` flags to be true — a non-collapsed
 * selection spanning multiple lines should not trigger history navigation.
 *
 * @param value - the textarea's current value.
 * @param selectionStart - the textarea's `selectionStart`.
 * @param selectionEnd - the textarea's `selectionEnd` (defaults to `selectionStart`).
 * @returns the caret's line information.
 */
export declare function cursorLineInfo(value: string, selectionStart: number, selectionEnd?: number): CursorLineInfo;
/**
 * Locate the DSH composer textarea in the current document.
 *
 * Walks from the event target up to find the closest `[data-composer-card]`
 * ancestor, then queries the descendant `<textarea>` inside it. Returns
 * `null` when the target is not inside the composer card (e.g. the user
 * is typing in another input or the textarea is momentarily absent).
 *
 * When called without an event target, falls back to a document-wide
 * query — used in tests and ad-hoc probing.
 *
 * @param from - the event target (or any node inside the composer card).
 * @returns the textarea element, or `null` when not found.
 */
export declare function findComposerTextarea(from?: EventTarget | null): HTMLTextAreaElement | null;
