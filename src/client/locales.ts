/**
 * Locale dictionaries for dsh-plugin-input-history.
 *
 * The plugin renders nothing visible — the only user-facing copy is the
 * `aria-label` on the invisible dock anchor (for screen readers) and a
 * future settings row label.
 *
 * @module @huanlin/dsh-plugin-input-history/client/locales
 */

/** All copy keys for the dsh-plugin-input-history namespace. */
export type InputHistoryKey =
  | 'ariaLabel'
  | 'restoredDraft'
  | 'noHistory'

/** Locale namespace id (matches the cordis.patch.yml plugin id). */
export const NS = 'dsh-plugin-input-history'

/** English dictionary. */
export const en: Record<InputHistoryKey, string> = {
  ariaLabel: 'Prompt history navigation (ArrowUp/ArrowDown)',
  restoredDraft: 'Restored in-progress draft',
  noHistory: 'No prompt history yet',
}

/** Chinese dictionary. */
export const zh: Record<InputHistoryKey, string> = {
  ariaLabel: '提示词历史导航（上/下方向键）',
  restoredDraft: '已恢复正在编辑的草稿',
  noHistory: '暂无提示词历史',
}
