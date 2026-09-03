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

import { useEffect, useMemo, useRef } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: SlotMap merge for 'conversation.composer.dock' (rc.1: owner
// props removed; `useInput`/`inputActions` come from the standard kit)
// + ui-conversation's SessionStandardProps merge.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: ui-chat's SessionStandardProps merge (useChat).
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { DEFAULT_CAPACITY, HistoryStore, entryAt, nextIndex } from './history.ts'
import { caretLineBoundary, findComposerEditable, findTriggerMenu } from './dom.ts'
import { isImeComposition } from './ime.ts'

/** Full props: dock runtime share (standard kit — rc.1 removed the InputZone owner) + locale seat. */
type HistoryDockProps = PropsRuntime<'conversation.composer.dock'> & PropsLocale<'dsh-plugin-input-history'>

/**
 * Module-scope history store, initialized once on first dock mount.
 * Shared across dock mount/unmount cycles; the underlying data persists
 * in `localStorage`.
 */
let historyStore: HistoryStore | null = null

/** Get the shared history store (initializes lazily on first call). */
export function getHistoryStore(): HistoryStore {
  if (historyStore === null) {
    historyStore = new HistoryStore(DEFAULT_CAPACITY)
  }
  return historyStore
}

/**
 * Render the invisible history dock entry: collection + navigation.
 *
 * @param props - dock runtime share (standard hooks) + locale seat.
 * @returns an `aria-hidden` anchor with zero layout footprint.
 */
export function HistoryDock({ useInput, useChat, inputActions, sessionId }: HistoryDockProps) {
  // Live machine faces for the keydown handler; `input` is read through the
  // standard selector hook (rc.1 dropped the dock slot's InputZone owner).
  const input = useInput(s => s)
  // History collection: the Chat target's legacy node slice (plain
  // ConversationNode list, newest last). The store dedupes, so re-appending
  // an unchanged latest text is a no-op.
  const nodes = useChat(s => s.legacy.nodes)
  const lastText = useMemo(() => latestUserOrSteeringText(nodes), [nodes])
  useEffect(() => {
    if (lastText !== null) getHistoryStore().append(lastText)
  }, [lastText])

  // Navigation cursor + saved draft. Reset on session switch: the saved
  // draft belonged to the previous session's composer and must not be
  // restored into the new one.
  const navCursorRef = useRef<number | null>(null)
  const savedDraftRef = useRef<string | null>(null)
  const prevSessionRef = useRef(sessionId)
  if (prevSessionRef.current !== sessionId) {
    prevSessionRef.current = sessionId
    navCursorRef.current = null
    savedDraftRef.current = null
  }

  // Live machine faces for the keydown handler; the refs refresh each
  // render so the handler (attached once) always reads current values.
  const inputRef = useRef(input)
  inputRef.current = input
  const actionsRef = useRef(inputActions)
  actionsRef.current = inputActions

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      if (isImeComposition(event)) return
      if (event.defaultPrevented) return
      if (actionsRef.current === undefined || inputRef.current === undefined) return
      // The keystroke must originate inside the composer's editable surface
      // (not the card's buttons or chrome).
      const editable = findComposerEditable(event.target)
      if (editable === null) return
      // Trigger menu open: arrows belong to menu highlight arbitration.
      if (findTriggerMenu(editable) !== null) return
      // Do not interfere with the submit transaction.
      if (inputRef.current.phase !== 'plain') return
      // Multi-line boundary: ArrowUp only on the first visual line,
      // ArrowDown only on the last; no geometry means do not navigate.
      const boundary = caretLineBoundary(editable)
      if (boundary === null) return
      if (event.key === 'ArrowUp' && !boundary.atFirstLine) return
      if (event.key === 'ArrowDown' && !boundary.atLastLine) return

      const history = getHistoryStore().list
      const dir = event.key === 'ArrowUp' ? 'up' : 'down'
      const next = nextIndex(navCursorRef.current, history.length, dir)

      // Down off the newest end: restore the saved draft (if any).
      if (next === null) {
        const saved = savedDraftRef.current
        navCursorRef.current = null
        if (saved !== null) {
          actionsRef.current.setDraft(saved)
          savedDraftRef.current = null
        }
        consume(event)
        return
      }

      // Entering history: save the current draft the first time we
      // navigate away from "not navigating".
      if (navCursorRef.current === null && savedDraftRef.current === null) {
        savedDraftRef.current = inputRef.current.draft
      }

      const entry = entryAt(history, next)
      if (entry === null) return
      navCursorRef.current = next
      actionsRef.current.setDraft(entry)
      consume(event)
    }
    document.addEventListener('keydown', handler, true)
    return () => {
      document.removeEventListener('keydown', handler, true)
    }
  }, [])

  // `display: none` keeps the anchor out of layout and out of the a11y tree.
  return <div aria-hidden style={{ display: 'none' }} data-dsh-plugin-input-history="" />
}

/**
 * Consume a navigated keystroke: `preventDefault` stops the browser's own
 * gesture, `stopPropagation` (capture phase, document level) keeps the
 * event from ever reaching Lexical's editable keydown listener — otherwise
 * the keymap would move the caret after the draft was already replaced.
 */
function consume(event: KeyboardEvent): void {
  event.preventDefault()
  event.stopPropagation()
}

/**
 * Extract the text of the latest `user` or `steering` node from the Chat
 * target's legacy node list.
 *
 * Returns the concatenated text of all `type: 'text'` content blocks.
 * Returns `null` when no user/steering node is present (e.g. a fresh
 * session with only a system/context message).
 *
 * @param nodes - the Chat snapshot's legacy `nodes` array (newest last).
 */
function latestUserOrSteeringText(
  nodes: ReadonlyArray<{
    kind: string
    content?: ReadonlyArray<{ type: string; text?: string }>
  }>,
): string | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]!
    if (node.kind !== 'user' && node.kind !== 'steering') continue
    const content = node.content
    if (content === undefined) continue
    let text = ''
    for (const block of content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        text += block.text
      }
    }
    return text
  }
  return null
}
