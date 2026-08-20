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
  readonly currentLine: number
  /** Total number of lines in the value (>= 1). */
  readonly totalLines: number
  /** True when the caret is collapsed and on the first line. */
  readonly atFirstLine: boolean
  /** True when the caret is collapsed and on the last line. */
  readonly atLastLine: boolean
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
export function cursorLineInfo(
  value: string,
  selectionStart: number,
  selectionEnd: number = selectionStart,
): CursorLineInfo {
  // Swap if reversed (the browser allows selectionStart > selectionEnd when
  // the user drags upwards); clamp to value bounds.
  const rawStart = Math.min(selectionStart, selectionEnd)
  const rawEnd = Math.max(selectionStart, selectionEnd)
  const clampedStart = Math.max(0, Math.min(rawStart, value.length))
  const clampedEnd = Math.max(clampedStart, Math.min(rawEnd, value.length))
  const collapsed = clampedStart === clampedEnd
  const lines = value.split('\n')
  const totalLines = lines.length
  let currentLine = 0
  let runningLength = 0
  for (let i = 0; i < totalLines; i++) {
    const line = lines[i]!
    // The caret at position `p` belongs to line `i` if `p` is in
    // [runningLength, runningLength + line.length + 1) — the `+1` covers
    // the position immediately after the line's last character, which is
    // still on this line (right before the `\n`). The very end of the
    // value (after the last line's last char) belongs to the last line.
    const lineEnd = runningLength + line.length
    const isLastLine = i === totalLines - 1
    const upperBound = isLastLine ? lineEnd + 1 : lineEnd + 1 // include the `\n` position
    if (clampedStart >= runningLength && clampedStart < upperBound) {
      currentLine = i
      break
    }
    runningLength = lineEnd + 1 // +1 for the `\n`
  }
  return {
    currentLine,
    totalLines,
    atFirstLine: collapsed && currentLine === 0,
    atLastLine: collapsed && currentLine === totalLines - 1,
  }
}

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
export function findComposerTextarea(from?: EventTarget | null): HTMLTextAreaElement | null {
  if (typeof document === 'undefined') return null
  if (from === undefined) {
    // No argument: document-wide query.
    return document.querySelector<HTMLTextAreaElement>('[data-composer-card] textarea')
  }
  // `null` or an actual target: do NOT fall back to document-wide query.
  if (from === null) return null
  // `closest` is on Element; EventTarget may be a Text node or other
  // non-Element node. Narrow with an instanceof check.
  const card = from instanceof Element ? from.closest('[data-composer-card]') : null
  if (card !== null) {
    const ta = card.querySelector<HTMLTextAreaElement>('textarea')
    if (ta !== null) return ta
  }
  return null
}
