/**
 * Override dictionaries for the 19 languages better-locale ships. Each
 * dict covers the full `dsh-plugin-input-history` key set (ariaLabel /
 * restoredDraft / noHistory), no placeholders — these are plain strings.
 *
 * Registered with better-locale only (see [index.ts](./index.ts)): the
 * override borrows DSH's English slot, so these render when the user
 * selected an override language AND DSH's active locale is `'en'`. zh-HK /
 * zh-TW / zh-MO have no regional variants for this copy, so the three
 * Traditional Chinese dicts are identical.
 */
import type { InputHistoryKey } from './locales.ts';
/**
 * All override dictionaries, keyed by language id, covering the full key
 * set. Registered with better-locale under the plugin namespace.
 */
export declare const dicts: Record<string, Record<InputHistoryKey, string>>;
