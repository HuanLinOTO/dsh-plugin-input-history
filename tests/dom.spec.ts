// @vitest-environment jsdom
/**
 * Unit tests for the DOM helpers: the pure line-boundary decision and the
 * jsdom-testable locators. The DOM geometry extraction
 * (`caretLineBoundary`) needs real layout rects and degrades to `null`
 * under jsdom, so only its pure decision core is exercised here.
 *
 * @module @huanlin/dsh-plugin-input-history/tests/dom.spec
 */
import { describe, expect, it } from 'vitest'
import { boundaryFromLineTops, findComposerEditable, findTriggerMenu } from '../src/client/dom.ts'

describe('boundaryFromLineTops', () => {
  it('reports a single-line box as both first and last line', () => {
    const info = boundaryFromLineTops(100, [100], 4)
    expect(info.atFirstLine).toBe(true)
    expect(info.atLastLine).toBe(true)
  })

  it('reports the first line for a caret on the first of many lines', () => {
    const info = boundaryFromLineTops(100, [100, 120, 140], 4)
    expect(info.atFirstLine).toBe(true)
    expect(info.atLastLine).toBe(false)
  })

  it('reports the last line for a caret on the last of many lines', () => {
    const info = boundaryFromLineTops(140, [100, 120, 140], 4)
    expect(info.atFirstLine).toBe(false)
    expect(info.atLastLine).toBe(true)
  })

  it('reports neither boundary for a caret on a middle line', () => {
    const info = boundaryFromLineTops(120, [100, 120, 140], 4)
    expect(info.atFirstLine).toBe(false)
    expect(info.atLastLine).toBe(false)
  })

  it('absorbs subpixel slop within the tolerance', () => {
    const info = boundaryFromLineTops(100.5, [103, 140], 4)
    expect(info.atFirstLine).toBe(true)
    expect(info.atLastLine).toBe(false)
  })

  it('rejects a caret a full line away even with tolerance', () => {
    const info = boundaryFromLineTops(125, [100, 140], 4)
    expect(info.atFirstLine).toBe(false)
    expect(info.atLastLine).toBe(false)
  })

  it('returns both flags false for an empty line-top list', () => {
    const info = boundaryFromLineTops(100, [], 4)
    expect(info.atFirstLine).toBe(false)
    expect(info.atLastLine).toBe(false)
  })

  it('keeps the flags independent for a two-line box', () => {
    const first = boundaryFromLineTops(100, [100, 120], 4)
    expect(first.atFirstLine).toBe(true)
    expect(first.atLastLine).toBe(false)
    const last = boundaryFromLineTops(120, [100, 120], 4)
    expect(last.atFirstLine).toBe(false)
    expect(last.atLastLine).toBe(true)
  })
})

describe('findComposerEditable', () => {
  it('returns null when the document has no composer card', () => {
    document.body.innerHTML = ''
    expect(findComposerEditable(document.body)).toBeNull()
  })

  it('returns null when the composer card has no editable', () => {
    document.body.innerHTML = '<div data-composer-card><p>no editable here</p></div>'
    expect(findComposerEditable(document.body.querySelector('p'))).toBeNull()
  })

  it('finds the editable via the event target ancestor walk', () => {
    document.body.innerHTML =
      '<div data-composer-card><div data-composer-input id="ed"></div></div>'
    const editable = document.getElementById('ed')!
    expect(findComposerEditable(editable)).toBe(editable)
  })

  it('finds the editable from a descendant of the editable', () => {
    document.body.innerHTML =
      '<div data-composer-card><div data-composer-input><p id="p"></p></div></div>'
    const editable = document.querySelector('[data-composer-input]')!
    const p = document.getElementById('p')!
    expect(findComposerEditable(p)).toBe(editable)
  })

  it('returns null when the target is inside the card but outside the editable', () => {
    document.body.innerHTML =
      '<div data-composer-card><div data-composer-input></div><button id="btn"></button></div>'
    const btn = document.getElementById('btn')!
    expect(findComposerEditable(btn)).toBeNull()
  })

  it('returns null when the target is outside the composer card', () => {
    document.body.innerHTML = `
      <div data-composer-card><div data-composer-input id="in-card"></div></div>
      <div id="outside"><div id="out-card"></div></div>
    `
    const outside = document.getElementById('outside')!
    expect(findComposerEditable(outside)).toBeNull()
  })

  it('returns null when called with a null target', () => {
    document.body.innerHTML = '<div data-composer-card><div data-composer-input></div></div>'
    expect(findComposerEditable(null)).toBeNull()
  })

  it('returns the first card\'s editable when multiple cards exist', () => {
    document.body.innerHTML = `
      <div data-composer-card><div data-composer-input id="first"></div></div>
      <div data-composer-card><div data-composer-input id="second"></div></div>
    `
    expect(findComposerEditable(document.getElementById('first'))?.id).toBe('first')
  })
})

describe('findTriggerMenu', () => {
  it('returns null when no trigger menu is open', () => {
    document.body.innerHTML = '<div data-composer-card><div data-composer-input id="ed"></div></div>'
    const editable = document.getElementById('ed')!
    expect(findTriggerMenu(editable)).toBeNull()
  })

  it('finds the open menu inside the same composer card', () => {
    document.body.innerHTML = `
      <div data-composer-card>
        <div data-composer-input id="ed"></div>
        <div data-trigger-menu></div>
      </div>
    `
    const editable = document.getElementById('ed')!
    expect(findTriggerMenu(editable)).not.toBeNull()
  })

  it('does not see a menu belonging to another composer card', () => {
    document.body.innerHTML = `
      <div data-composer-card>
        <div data-composer-input id="ed"></div>
      </div>
      <div data-composer-card>
        <div data-composer-input></div>
        <div data-trigger-menu></div>
      </div>
    `
    const editable = document.getElementById('ed')!
    expect(findTriggerMenu(editable)).toBeNull()
  })
})
