/**
 * IME-composition key guard.
 *
 * While a Chinese/Japanese/Korean input method is composing (the user is
 * picking a candidate from the IME window), every pressed key BELONGS to
 * the input method: arrows move the candidate highlight, Enter/Space
 * confirm the composition, Escape cancels it. Page code must not process
 * those keys — a history-navigation handler that calls `preventDefault()`
 * on ArrowUp/ArrowDown during composition would silently break the IME:
 * candidates stop responding, the composition gets torn apart, and only
 * bare letters come out.
 *
 * The composition signal follows the DSH core convention (InputBar's IME
 * guard, issue #535): `isComposing` for modern engines, keyCode 229 as
 * the legacy signal engines emit without isComposing.
 *
 * @module @huanlin/dsh-plugin-input-history/client/ime
 */

/** The pure decision: is this keyboard event part of an IME composition? */
export function isImeComposition(event: { isComposing: boolean; keyCode: number }): boolean {
  return event.isComposing || event.keyCode === 229
}
