// @vitest-environment jsdom
/**
 * Unit tests for the DOM helpers.
 *
 * @module @huanlin/dsh-plugin-input-history/tests/dom.spec
 */
import { describe, expect, it } from 'vitest'
import { cursorLineInfo, findComposerTextarea } from '../src/client/dom.ts'

describe('cursorLineInfo', () => {
  it('reports a single-line value as both first and last line', () => {
    const info = cursorLineInfo('hello', 2)
    expect(info.currentLine).toBe(0)
    expect(info.totalLines).toBe(1)
    expect(info.atFirstLine).toBe(true)
    expect(info.atLastLine).toBe(true)
  })

  it('reports the first line for a caret at position 0', () => {
    const info = cursorLineInfo('abc\ndef\nghi', 0)
    expect(info.currentLine).toBe(0)
    expect(info.atFirstLine).toBe(true)
    expect(info.atLastLine).toBe(false)
  })

  it('reports the last line for a caret at the end', () => {
    const value = 'abc\ndef\nghi'
    const info = cursorLineInfo(value, value.length)
    expect(info.currentLine).toBe(2)
    expect(info.atFirstLine).toBe(false)
    expect(info.atLastLine).toBe(true)
  })

  it('reports the middle line for a caret in the middle', () => {
    const info = cursorLineInfo('abc\ndef\nghi', 5) // inside 'def'
    expect(info.currentLine).toBe(1)
    expect(info.atFirstLine).toBe(false)
    expect(info.atLastLine).toBe(false)
  })

  it('treats the position right after a line\'s last char as that line', () => {
    // caret at index 3 = right after 'abc', before '\n'
    const info = cursorLineInfo('abc\ndef', 3)
    expect(info.currentLine).toBe(0)
    expect(info.atFirstLine).toBe(true)
    expect(info.atLastLine).toBe(false)
  })

  it('treats the position right after a newline as the next line', () => {
    // caret at index 4 = right after '\n', at start of 'def'
    const info = cursorLineInfo('abc\ndef', 4)
    expect(info.currentLine).toBe(1)
    expect(info.atFirstLine).toBe(false)
    expect(info.atLastLine).toBe(true)
  })

  it('returns atFirstLine/atLastLine false for a non-collapsed selection', () => {
    const info = cursorLineInfo('abc\ndef', 1, 5)
    expect(info.atFirstLine).toBe(false)
    expect(info.atLastLine).toBe(false)
  })

  it('returns atFirstLine true for a collapsed-on-first-line selection', () => {
    // selectionStart === selectionEnd on first line
    const info = cursorLineInfo('abc\ndef', 1, 1)
    expect(info.atFirstLine).toBe(true)
    expect(info.atLastLine).toBe(false)
  })

  it('handles an empty value as a single first+last line', () => {
    const info = cursorLineInfo('', 0)
    expect(info.currentLine).toBe(0)
    expect(info.totalLines).toBe(1)
    expect(info.atFirstLine).toBe(true)
    expect(info.atLastLine).toBe(true)
  })

  it('handles a value ending with a newline (trailing empty line)', () => {
    // 'abc\n' splits into ['abc', '']
    const info = cursorLineInfo('abc\n', 4)
    expect(info.currentLine).toBe(1)
    expect(info.totalLines).toBe(2)
    expect(info.atFirstLine).toBe(false)
    expect(info.atLastLine).toBe(true)
  })

  it('clamps selectionStart/End to the value bounds', () => {
    const info1 = cursorLineInfo('abc', -5)
    expect(info1.currentLine).toBe(0)
    const info2 = cursorLineInfo('abc', 100)
    expect(info2.currentLine).toBe(0)
    expect(info2.atLastLine).toBe(true)
  })

  it('swaps selectionStart > selectionEnd', () => {
    const info = cursorLineInfo('abc\ndef', 5, 1)
    // collapsed=false (5 !== 1), so neither flag is true
    expect(info.atFirstLine).toBe(false)
    expect(info.atLastLine).toBe(false)
  })

  it('handles many lines', () => {
    const value = 'a\nb\nc\nd\ne'
    // caret at start of 'c' (after 'a\nb\n' = index 4)
    const info = cursorLineInfo(value, 4)
    expect(info.currentLine).toBe(2)
    expect(info.totalLines).toBe(5)
    expect(info.atFirstLine).toBe(false)
    expect(info.atLastLine).toBe(false)
  })
})

describe('findComposerTextarea', () => {
  it('returns null when document has no composer card', () => {
    document.body.innerHTML = ''
    expect(findComposerTextarea()).toBeNull()
  })

  it('returns null when the composer card has no textarea', () => {
    document.body.innerHTML = '<div data-composer-card><p>no textarea here</p></div>'
    expect(findComposerTextarea()).toBeNull()
  })

  it('finds the textarea via document-wide query', () => {
    document.body.innerHTML = '<div data-composer-card><textarea></textarea></div>'
    const ta = findComposerTextarea()
    expect(ta).not.toBeNull()
    expect(ta?.tagName).toBe('TEXTAREA')
  })

  it('finds the textarea via event target ancestor walk', () => {
    document.body.innerHTML = '<div data-composer-card><div class="wrap"><textarea id="t"></textarea></div></div>'
    const ta = document.getElementById('t')!
    const found = findComposerTextarea(ta)
    expect(found).toBe(ta)
  })

  it('returns null when event target is outside the composer card', () => {
    document.body.innerHTML = `
      <div data-composer-card><textarea id="in-card"></textarea></div>
      <div id="outside"><textarea id="out-card"></textarea></div>
    `
    const outside = document.getElementById('outside')!
    expect(findComposerTextarea(outside)).toBeNull()
  })

  it('returns null when called with a null target', () => {
    document.body.innerHTML = '<div data-composer-card><textarea></textarea></div>'
    expect(findComposerTextarea(null)).toBeNull()
  })

  it('handles multiple composer cards (returns the first)', () => {
    document.body.innerHTML = `
      <div data-composer-card><textarea id="first"></textarea></div>
      <div data-composer-card><textarea id="second"></textarea></div>
    `
    const ta = findComposerTextarea()
    expect(ta?.id).toBe('first')
  })
})
