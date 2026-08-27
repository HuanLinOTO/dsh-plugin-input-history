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
  readonly atFirstLine: boolean
  /** True when the caret is collapsed and on the last visual line. */
  readonly atLastLine: boolean
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
 * @returns the boundary flags; both false for an empty `lineTops`.
 */
export function boundaryFromLineTops(
  caretTop: number,
  lineTops: readonly number[],
  tolerance: number,
): LineBoundary {
  if (lineTops.length === 0) return { atFirstLine: false, atLastLine: false }
  return {
    atFirstLine: caretTop <= lineTops[0]! + tolerance,
    atLastLine: caretTop >= lineTops[lineTops.length - 1]! - tolerance,
  }
}

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
export function findComposerEditable(from: EventTarget | null): HTMLElement | null {
  if (typeof document === 'undefined') return null
  if (from === null || !(from instanceof Element)) return null
  const card = from.closest('[data-composer-card]')
  if (card === null) return null
  const editable = card.querySelector<HTMLElement>('[data-composer-input]')
  if (editable === null) return null
  return editable.contains(from) ? editable : null
}

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
export function findTriggerMenu(editable: HTMLElement): Element | null {
  const card = editable.closest('[data-composer-card]')
  return card === null ? null : card.querySelector('[data-trigger-menu]')
}

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
export function caretLineBoundary(editable: HTMLElement, tolerance: number = 4): LineBoundary | null {
  const selection = window.getSelection()
  if (selection === null || selection.rangeCount === 0) return null
  if (!selection.isCollapsed) return null
  const caretTop = caretTopOf(selection)
  if (caretTop === null) return null
  const lineTops = contentLineTops(editable)
  if (lineTops === null) return null
  return boundaryFromLineTops(caretTop, lineTops, tolerance)
}

/** Viewport `top` of the collapsed caret's box, or `null` when unmeasurable. */
function caretTopOf(selection: Selection): number | null {
  const rects = selection.getRangeAt(0).getClientRects()
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]!
    if (rect.height === 0 && rect.width === 0) continue
    return rect.top
  }
  // Some engines report a zero-box collapsed caret; the anchor's element
  // box is the line the caret sits on (the same ruler InputBar's reveal uses).
  const anchor = selection.anchorNode
  const el = anchor instanceof HTMLElement ? anchor : anchor?.parentElement
  return el === undefined || el === null ? null : el.getBoundingClientRect().top
}

/** Ascending, deduped tops of the editable content's visual lines; `null` without geometry. */
function contentLineTops(editable: HTMLElement): number[] | null {
  const range = document.createRange()
  range.selectNodeContents(editable)
  const rects = range.getClientRects()
  const tops: number[] = []
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]!
    if (rect.height === 0 && rect.width === 0) continue
    const top = rect.top
    // Rects come in document order; fragments of one visual line differ by
    // subpixel amounts, real lines by a full line height.
    if (tops.length === 0 || Math.abs(top - tops[tops.length - 1]!) > 2) tops.push(top)
  }
  return tops
}
