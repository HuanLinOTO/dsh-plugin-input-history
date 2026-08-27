/**
 * DOM helpers for the Lexical composer surface.
 *
 * The DSH composer's text surface is a Lexical-bound contenteditable div,
 * not a textarea: plugins cannot obtain a React ref or a slot-currency
 * handle to it, and writing text goes through `inputActions.setDraft` (the
 * public machine action), not the DOM. What remains DOM-bound is geometry
 * and focus: locating the editable the keystroke targeted, detecting an
 * open trigger menu, and deciding whether the collapsed caret sits on the
 * first/last visual line of a multi-line draft.
 *
 * All markers queried here are internal to `@deepseek-ai/dsh-client-ui-conversation`
 * (`InputBar.tsx` / `ComposerContentEditable.tsx`) or
 * `@deepseek-ai/dsh-client-ui-input-trigger` (`MenuView.tsx`); they are
 * stable but undocumented, and the locators below are the single point to
 * update if upstream changes them.
 *
 * @module @huanlin/dsh-plugin-input-history/client/dom
 */
/** Line-boundary decision for a collapsed caret. */
export interface LineBoundary {
    /** True when the caret is collapsed and on the first visual line. */
    readonly atFirstLine: boolean;
    /** True when the caret is collapsed and on the last visual line. */
    readonly atLastLine: boolean;
}
/**
 * Pure decision over caret geometry: where a caret resting at `caretTop`
 * sits relative to the box whose visual line tops are `lineTops` (ascending,
 * one entry per visual line, viewport coordinates).
 *
 * @param caretTop - viewport `top` of the collapsed caret's box.
 * @param lineTops - viewport `top` of each visual line, ascending.
 * @param tolerance - px slop absorbing subpixel rounding between the caret
 *   rect and its line's rect.
 * @returns the boundary flags; an empty `lineTops` (empty editable) is
 *   treated as a single virtual line, so both flags are true.
 */
export declare function boundaryFromLineTops(caretTop: number, lineTops: readonly number[], tolerance: number): LineBoundary;
/**
 * Locate the DSH composer editable the event targeted.
 *
 * Walks from the event target up to the closest `[data-composer-card]`
 * ancestor, queries the `[data-composer-input]` contenteditable inside it,
 * and confirms the target sits inside that editable (keystrokes on the
 * card's buttons and chrome do not navigate history). Returns `null` when
 * the target is not inside the composer editable.
 *
 * @param from - the event target (or any node inside the composer editable).
 * @returns the editable element, or `null` when not found.
 */
export declare function findComposerEditable(from: EventTarget | null): HTMLElement | null;
/**
 * Detect an open trigger (slash-command / @-mention) menu inside the
 * composer card that owns `editable`.
 *
 * While the menu is open, ArrowUp/ArrowDown move the highlighted row and
 * must not recall history. The menu renders inside the same
 * `[data-composer-card]` as the editable and carries the stable
 * `data-trigger-menu` marker.
 *
 * @param editable - the composer editable element.
 * @returns the menu element, or `null` when no menu is open.
 */
export declare function findTriggerMenu(editable: HTMLElement): Element | null;
/**
 * Decide the collapsed caret's line boundary inside the composer editable.
 *
 * Compares the caret's viewport box against the editable content's visual
 * line boxes (`Range.getClientRects()` yields one rect per line fragment;
 * fragments of the same visual line share a top within subpixel slop, so
 * tops are deduped with a 2px threshold). A non-collapsed selection and a
 * geometry-less environment (headless/jsdom) both return `null`, which the
 * caller must treat as "do not navigate".
 *
 * @param editable - the composer editable element.
 * @param tolerance - px slop between the caret rect and its line rect
 *   (defaults to 4px).
 * @returns the boundary flags, or `null` when they cannot be determined.
 */
export declare function caretLineBoundary(editable: HTMLElement, tolerance?: number): LineBoundary | null;
