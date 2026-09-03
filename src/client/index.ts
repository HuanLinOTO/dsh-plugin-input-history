/**
 * dsh-plugin-input-history — browser half.
 *
 * One registration: the `conversation.composer.dock` list slot (id
 * `dsh-plugin-input-history`, order 100) mounts the invisible dock entry
 * that owns both plugin behaviors — prompt-history collection from the
 * Chat target's user/steering nodes, and the capture-phase document
 * keydown listener that navigates the composer draft through
 * `inputActions.setDraft`. See [HistoryDock.tsx](./HistoryDock.tsx) for
 * the data flow; the dock is session-scoped, so in hero/blank mode the
 * plugin is dormant (no input machine exists there to drive).
 *
 * History is collected from `user` and `steering` chat nodes of any active
 * session, persisted to `localStorage` (FIFO, 500 entries), and shared
 * across all sessions in the same browser profile.
 *
 * @module @huanlin/dsh-plugin-input-history/client
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the renderer's Context merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: SlotMap merge (conversation.composer.dock) + ui-conversation's
// SessionStandardProps merge (useInput, inputActions) used by the dock.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: ui-chat's SessionStandardProps merge (useChat) used by the dock.
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { HistoryDock } from './HistoryDock.tsx'
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
 * Client plugin body: register the dock + locale dictionaries.
 *
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-plugin-input-history: dictionaries')

  // better-locale override: register the 19-language dicts so a selected
  // override language (with DSH on 'en') replaces the plugin's copy. The
  // service is optional — no better-locale, no dicts.
  // Activation-order-safe: re-check ctx.get('betterLocale') on every locale
  // revision bump (better-locale bumps on activation + override switch).
  ctx.effect(() => {
    let dispose: (() => void) | undefined
    const sync = (): void => {
      dispose?.()
      dispose = undefined
      const store = ctx.get('betterLocale') as BetterLocaleOverrideStore | undefined
      if (store !== undefined) {
        dispose = store.register(NS, dicts)
      }
    }
    sync()
    const unsubscribe = ctx.locale.subscribe(sync)
    return () => {
      unsubscribe()
      dispose?.()
    }
  }, 'dsh-plugin-input-history: better-locale override dicts')

  // The dock collects history from the Chat target's nodes and attaches the
  // capture-phase keydown listener. It is session-scoped; in hero/blank mode
  // it is unmounted and the plugin is dormant (no input machine exists there).
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
}
