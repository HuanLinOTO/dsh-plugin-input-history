/**
 * Unit tests for the IME composition guard.
 *
 * @module @huanlin/dsh-plugin-input-history/tests/ime.spec
 */
import { describe, expect, it } from 'vitest'
import { isImeComposition } from '../src/client/ime.ts'

describe('isImeComposition', () => {
  it('returns false for a normal key event (not composing, keyCode != 229)', () => {
    expect(isImeComposition({ isComposing: false, keyCode: 65 })).toBe(false) // 'a'
    expect(isImeComposition({ isComposing: false, keyCode: 38 })).toBe(false) // ArrowUp
    expect(isImeComposition({ isComposing: false, keyCode: 40 })).toBe(false) // ArrowDown
  })

  it('returns true when isComposing is true', () => {
    expect(isImeComposition({ isComposing: true, keyCode: 38 })).toBe(true)
    expect(isImeComposition({ isComposing: true, keyCode: 13 })).toBe(true)
    expect(isImeComposition({ isComposing: true, keyCode: 0 })).toBe(true)
  })

  it('returns true when keyCode is 229 (legacy IME signal)', () => {
    expect(isImeComposition({ isComposing: false, keyCode: 229 })).toBe(true)
    expect(isImeComposition({ isComposing: true, keyCode: 229 })).toBe(true)
  })

  it('returns false for modifier keys outside composition', () => {
    expect(isImeComposition({ isComposing: false, keyCode: 16 })).toBe(false) // Shift
    expect(isImeComposition({ isComposing: false, keyCode: 17 })).toBe(false) // Ctrl
    expect(isImeComposition({ isComposing: false, keyCode: 18 })).toBe(false) // Alt
  })
})
