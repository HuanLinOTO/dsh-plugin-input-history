/**
 * dsh-plugin-input-history — browser half.
 *
 * Two registrations:
 *   - `conversation.composer.dock` list slot (id `dsh-plugin-input-history`,
 *     order 100) — renders an invisible anchor that collects history from
 *     `session.nodes` every render. The dock is session-scoped; DSH treats
 *     blank sessions as "hero" and suppresses the dock, so history
 *     collection only runs in active sessions. That is fine: the first
 *     message in a blank session is collected after the session becomes
 *     active (the message makes it non-blank).
 *   - A document-level `keydown` listener attached in `apply` (NOT in the
 *     dock component) — this ensures the listener is always active,
 *     including in hero/blank mode where the dock is suppressed. The
 *     listener uses the native `value` setter + `dispatchEvent('input')`
 *     to feed history text into the textarea, which triggers InputBar's
 *     `onChange` → `keyboard.setDraft` — the same path the user's typing
 *     takes.
 *
 * History is collected from `user` and `steering` conversation nodes as
 * they appear in any session's `ConversationSnapshot`, persisted to
 * `localStorage` (FIFO, 500 entries), and shared across all sessions
 * in the same browser profile.
 *
 * @module @huanlin/dsh-plugin-input-history/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the shell's SlotMap merge (conversation.composer.dock)
// + SessionStandardProps (useInput, inputActions).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { HistoryDock, getHistoryStore } from './HistoryDock.tsx'
import { isImeComposition } from './ime.ts'
import { cursorLineInfo, findComposerTextarea } from './dom.ts'
import { nextIndex, entryAt } from './history.ts'
import { en, NS, zh, type InputHistoryKey } from './locales.ts'
import { dicts } from './dictionaries.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The dock's aria-label + future settings row copy. */
    'dsh-plugin-input-history': InputHistoryKey
  }
}

/** Required services: slots + locale. */
export const inject = ['slots', 'locale']

/** Structural view of better-locale's override store (optional; no runtime dep). */
interface BetterLocaleOverrideStore {
  register(ns: string, dicts: Record<string, Record<string, string>>): () => void
}

/**
 * Navigation cursor + saved draft for the keydown listener. Module-scoped
 * because the listener is attached once in `apply` and must persist across
 * dock mount/unmount cycles.
 */
let navCursor: number | null = null
let savedDraft: string | null = null

/**
 * Client plugin body: register the dock + attach the keydown listener.
 *
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-plugin-input-history: dictionaries')

  // better-locale override: register the 19-language dicts so a selected
  // override language (with DSH on 'en') replaces the plugin's copy. The
  // service is optional — no better-locale, no dicts.
  const betterLocale = ctx.get('betterLocale') as BetterLocaleOverrideStore | undefined
  if (betterLocale !== undefined) {
    ctx.effect(() => betterLocale.register(NS, dicts), 'dsh-plugin-input-history: better-locale override dicts')
  }

  // The dock collects history from session.nodes. It is session-scoped;
  // in hero/blank mode it is suppressed, but the keydown listener below
  // still works (it reads from the module-scope HistoryStore, which
  // persists across dock mount/unmount cycles via localStorage).
  ctx.slots.inject('conversation.composer.dock', () =>
    ctx.slots.register(
      {
        name: 'conversation.composer.dock',
        id: 'dsh-plugin-input-history',
        order: 100,
        locale: NS,
      },
      HistoryDock,
    ),
  )

  // Attach the document-level keydown listener. This lives in `apply`
  // (not in the dock component) so it stays active even when the dock is
  // suppressed (hero/blank sessions — ConversationRoot.tsx:79-80 treats
  // blank sessions as hero, and line 156 skips the dock render).
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      if (isImeComposition(event)) return
      if (event.defaultPrevented) return
      const textarea = findComposerTextarea(event.target)
      if (textarea === null) return
      if (event.target !== textarea) return
      // Skip if the textarea is readOnly or disabled — hero mode's
      // workspace-picker trigger, or a submitting machine phase.
      if (textarea.readOnly || textarea.disabled) return

      const store = getHistoryStore()
      const history = store.list

      // Multi-line boundary check.
      const info = cursorLineInfo(textarea.value, textarea.selectionStart, textarea.selectionEnd)
      if (event.key === 'ArrowUp' && !info.atFirstLine) return
      if (event.key === 'ArrowDown' && !info.atLastLine) return

      const dir = event.key === 'ArrowUp' ? 'up' : 'down'
      const next = nextIndex(navCursor, history.length, dir)

      // Down off the newest end: restore the saved draft (if any).
      if (next === null) {
        const saved = savedDraft
        navCursor = null
        if (saved !== null) {
          setNativeTextareaValue(textarea, saved)
          savedDraft = null
        }
        event.preventDefault()
        return
      }

      // Entering history: save the current draft the first time we
      // navigate away from "not navigating".
      if (navCursor === null && savedDraft === null) {
        savedDraft = textarea.value
      }

      const entry = entryAt(history, next)
      if (entry === null) return
      navCursor = next
      setNativeTextareaValue(textarea, entry)
      event.preventDefault()
    }
    document.addEventListener('keydown', handler, false)
    return () => {
      document.removeEventListener('keydown', handler, false)
    }
  }, 'dsh-plugin-input-history: keydown listener')
}

/**
 * Set the textarea value via the native prototype setter and dispatch an
 * `input` event so React's controlled-component onChange fires.
 *
 * React 18 tracks the textarea's value internally; directly assigning
 * `textarea.value = x` does NOT trigger React's onChange because React's
 * value tracker compares against its last-seen value. Using the native
 * prototype setter bypasses React's tracker, and the dispatched `input`
 * event makes React detect the change and run InputBar's `onChange` →
 * `keyboard.setDraft(next)`. This is the same technique used by
 * browser automation libraries (Playwright, Testing Library) to simulate
 * user typing in React controlled inputs.
 *
 * @param textarea - the target textarea element.
 * @param value - the new value to set.
 */
function setNativeTextareaValue(textarea: HTMLTextAreaElement, value: string): void {
  const proto = window.HTMLTextAreaElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  if (descriptor === undefined || descriptor.set === undefined) {
    // Fallback: direct assignment (may not trigger React onChange in
    // all browsers, but better than nothing).
    textarea.value = value
    return
  }
  descriptor.set.call(textarea, value)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}
