/**
 * Prompt history store — pure functions over a string array.
 *
 * The store is a FIFO list of unique prompt strings, persisted to
 * `localStorage`. Newest entries are at the end of the array. The
 * navigation cursor walks backwards from the end (ArrowUp = older,
 * ArrowDown = newer).
 *
 * The functions in this module are pure (no `localStorage` access) so
 * they can be unit-tested without jsdom. The `HistoryStore` class below
 * wires them to `localStorage` with try/catch containment — a quota
 * exception or a disabled storage (private mode) degrades gracefully to
 * an in-memory list that lives for the page lifetime.
 *
 * @module @huanlin/dsh-plugin-input-history/client/history
 */
/** localStorage key (versioned; bump on schema changes to start fresh). */
export declare const STORAGE_KEY = "dsh-plugin-input-history:v1";
/** Default capacity when none is configured. */
export declare const DEFAULT_CAPACITY = 500;
/**
 * Append a prompt to the history.
 *
 * Rules:
 *   - Empty / whitespace-only strings are ignored (the InputBar already
 *     rejects them at submit, but defensive).
 *   - When the new entry equals the most recent one, it is a no-op
 *     (avoids stacking duplicates from rapid resends).
 *   - When the new entry already exists earlier in the history, that
 *     earlier occurrence is removed (recency wins; the prompt moves to
 *     the end). This mirrors terminal shell behaviour.
 *   - When the array would exceed `capacity`, the oldest entries are
 *     dropped from the front (FIFO).
 *
 * @param history - the current history array (newest at end).
 * @param prompt - the prompt to append.
 * @param capacity - the maximum number of entries to retain.
 * @returns the new history array (may be the same reference if no-op).
 */
export declare function appendHistory(history: readonly string[], prompt: string, capacity?: number): string[];
/**
 * Navigation cursor for walking the history.
 *
 * The cursor is `null` when the user is not navigating (i.e. they are
 * typing a fresh draft). ArrowUp sets it to the last index, then
 * decrements; ArrowDown increments; when it would exceed `history.length
 * - 1`, it returns to `null` (meaning "restore the in-progress draft").
 *
 * @param current - the current cursor (null = not navigating).
 * @param total - the total number of history entries.
 * @param dir - `'up'` (older) or `'down'` (newer).
 * @returns the next cursor, or `null` when navigation falls off the
 *   newest end (caller should restore the saved draft).
 */
export declare function nextIndex(current: number | null, total: number, dir: 'up' | 'down'): number | null;
/**
 * Read the history entry at a cursor, or `null` when the cursor is null.
 *
 * @param history - the history array.
 * @param cursor - the navigation cursor.
 * @returns the prompt at the cursor, or `null`.
 */
export declare function entryAt(history: readonly string[], cursor: number | null): string | null;
/**
 * History store bound to `localStorage`.
 *
 * The store reads once on construction (or on `reload()`) and keeps an
 * in-memory copy. Writes go to both memory and `localStorage` inside a
 * try/catch — a quota exception leaves the in-memory copy authoritative
 * for the rest of the page lifetime. This trades cross-tab consistency
 * for resilience: the store never throws on a write, and the worst case
 * is that a tab keeps its own view until refresh.
 *
 * Cross-tab sync is intentionally NOT implemented: prompt history is
 * append-mostly and a stale read across tabs is harmless (the next
 * append corrects it). Listening to the `storage` event would add
 * reactivity that the navigation UI does not need.
 */
export declare class HistoryStore {
    private readonly capacity;
    private items;
    private readonly storage;
    private readonly key;
    /**
     * @param capacity - maximum entries to retain (FIFO).
     * @param storage - the storage backend (defaults to `localStorage` when available).
     * @param key - the storage key (defaults to {@link STORAGE_KEY}).
     */
    constructor(capacity?: number, storage?: Storage | null, key?: string);
    /** Current history snapshot (newest at end). */
    get list(): readonly string[];
    /** Number of entries currently stored. */
    get length(): number;
    /** Reload from storage (e.g. after a suspected external edit). Truncates to the current capacity. */
    reload(): void;
    /**
     * Append a prompt and persist. See {@link appendHistory} for rules.
     * @returns the new history snapshot.
     */
    append(prompt: string): readonly string[];
    /** Clear all history (used by tests and a future "clear" UI). */
    clear(): void;
    private readFromStorage;
    private writeToStorage;
}
