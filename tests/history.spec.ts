/**
 * Unit tests for the prompt history store.
 *
 * @module @huanlin/dsh-plugin-input-history/tests/history.spec
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CAPACITY,
  HistoryStore,
  STORAGE_KEY,
  appendHistory,
  entryAt,
  nextIndex,
} from '../src/client/history.ts'

describe('appendHistory', () => {
  it('appends a new prompt at the end', () => {
    expect(appendHistory([], 'hello')).toEqual(['hello'])
    expect(appendHistory(['hello'], 'world')).toEqual(['hello', 'world'])
  })

  it('ignores empty and whitespace-only prompts', () => {
    expect(appendHistory([], '')).toEqual([])
    expect(appendHistory([], '   ')).toEqual([])
    expect(appendHistory([], '\t\n')).toEqual([])
    expect(appendHistory(['a'], '  ')).toEqual(['a'])
  })

  it('trims before appending', () => {
    expect(appendHistory([], '  hello  ')).toEqual(['hello'])
  })

  it('is a no-op when the new prompt equals the most recent one', () => {
    const h = ['a', 'b', 'c']
    expect(appendHistory(h, 'c')).toBe(h) // same reference
    expect(appendHistory(h, 'c')).toEqual(['a', 'b', 'c'])
  })

  it('removes earlier occurrences to enforce recency ordering', () => {
    expect(appendHistory(['a', 'b', 'a'], 'a')).toEqual(['b', 'a'])
    expect(appendHistory(['a', 'b', 'c', 'b'], 'b')).toEqual(['a', 'c', 'b'])
  })

  it('drops oldest entries when exceeding capacity', () => {
    const cap = 3
    expect(appendHistory(['a', 'b', 'c'], 'd', cap)).toEqual(['b', 'c', 'd'])
    expect(appendHistory(['a', 'b', 'c', 'd'], 'e', cap)).toEqual(['c', 'd', 'e'])
  })

  it('enforces minimum capacity of 1', () => {
    expect(appendHistory(['a', 'b', 'c'], 'd', 0)).toEqual(['d'])
    expect(appendHistory(['a', 'b', 'c'], 'd', -5)).toEqual(['d'])
  })

  it('handles capacity 1 with duplicate at the tail', () => {
    expect(appendHistory(['a'], 'a', 1)).toEqual(['a'])
    expect(appendHistory(['a'], 'b', 1)).toEqual(['b'])
  })
})

describe('nextIndex', () => {
  it('returns null when history is empty', () => {
    expect(nextIndex(null, 0, 'up')).toBeNull()
    expect(nextIndex(null, 0, 'down')).toBeNull()
    expect(nextIndex(0, 0, 'up')).toBeNull()
    expect(nextIndex(0, 0, 'down')).toBeNull()
  })

  it('ArrowUp from null jumps to the newest entry', () => {
    expect(nextIndex(null, 5, 'up')).toBe(4)
    expect(nextIndex(null, 1, 'up')).toBe(0)
  })

  it('ArrowUp decrements the cursor', () => {
    expect(nextIndex(4, 5, 'up')).toBe(3)
    expect(nextIndex(1, 5, 'up')).toBe(0)
  })

  it('ArrowUp at 0 stays at 0', () => {
    expect(nextIndex(0, 5, 'up')).toBe(0)
  })

  it('ArrowDown from null stays null', () => {
    expect(nextIndex(null, 5, 'down')).toBeNull()
  })

  it('ArrowDown increments the cursor', () => {
    expect(nextIndex(0, 5, 'down')).toBe(1)
    expect(nextIndex(3, 5, 'down')).toBe(4)
  })

  it('ArrowDown at the newest entry returns null (restore draft)', () => {
    expect(nextIndex(4, 5, 'down')).toBeNull()
    expect(nextIndex(0, 1, 'down')).toBeNull()
  })
})

describe('entryAt', () => {
  it('returns the entry at the cursor', () => {
    expect(entryAt(['a', 'b', 'c'], 0)).toBe('a')
    expect(entryAt(['a', 'b', 'c'], 2)).toBe('c')
  })

  it('returns null for null cursor', () => {
    expect(entryAt(['a', 'b', 'c'], null)).toBeNull()
  })

  it('returns null for out-of-range cursor', () => {
    expect(entryAt(['a', 'b', 'c'], -1)).toBeNull()
    expect(entryAt(['a', 'b', 'c'], 3)).toBeNull()
    expect(entryAt([], 0)).toBeNull()
  })

  it('returns null for undefined slot', () => {
    expect(entryAt(['a', 'b', undefined as unknown as string], 2)).toBeNull()
  })
})

describe('HistoryStore', () => {
  // In-memory storage stub — avoids jsdom and isolates tests from the
  // browser localStorage implementation.
  function makeMemoryStorage(): Storage {
    const map = new Map<string, string>()
    return {
      get length() { return map.size },
      clear() { map.clear() },
      getItem(key) { return map.has(key) ? map.get(key)! : null },
      key(index) { return [...map.keys()][index] ?? null },
      removeItem(key) { map.delete(key) },
      setItem(key, value) { map.set(key, value) },
    }
  }

  it('reads an empty store when storage is empty', () => {
    const storage = makeMemoryStorage()
    const store = new HistoryStore(50, storage)
    expect(store.length).toBe(0)
    expect([...store.list]).toEqual([])
  })

  it('appends and persists across instances', () => {
    const storage = makeMemoryStorage()
    const store1 = new HistoryStore(50, storage)
    store1.append('hello')
    store1.append('world')
    expect([...store1.list]).toEqual(['hello', 'world'])

    const store2 = new HistoryStore(50, storage)
    expect([...store2.list]).toEqual(['hello', 'world'])
  })

  it('applies capacity on append', () => {
    const storage = makeMemoryStorage()
    const store = new HistoryStore(2, storage)
    store.append('a')
    store.append('b')
    store.append('c')
    expect([...store.list]).toEqual(['b', 'c'])
  })

  it('applies capacity on reload (truncates persisted overflow)', () => {
    const storage = makeMemoryStorage()
    const store1 = new HistoryStore(2, storage)
    store1.append('a')
    store1.append('b')
    store1.append('c') // ['b', 'c']
    const store2 = new HistoryStore(1, storage) // smaller capacity
    store2.reload()
    expect([...store2.list]).toEqual(['c'])
  })

  it('clears the store and the storage', () => {
    const storage = makeMemoryStorage()
    const store = new HistoryStore(50, storage)
    store.append('a')
    store.append('b')
    store.clear()
    expect(store.length).toBe(0)
    expect(storage.getItem(STORAGE_KEY)).toBe('[]')
  })

  it('returns the new list from append', () => {
    const storage = makeMemoryStorage()
    const store = new HistoryStore(50, storage)
    expect([...store.append('a')]).toEqual(['a'])
    expect([...store.append('b')]).toEqual(['a', 'b'])
  })

  it('tolerates corrupted storage (non-JSON)', () => {
    const storage = makeMemoryStorage()
    storage.setItem(STORAGE_KEY, 'not json')
    const store = new HistoryStore(50, storage)
    expect(store.length).toBe(0)
  })

  it('tolerates corrupted storage (non-array JSON)', () => {
    const storage = makeMemoryStorage()
    storage.setItem(STORAGE_KEY, '{"a":1}')
    const store = new HistoryStore(50, storage)
    expect(store.length).toBe(0)
  })

  it('tolerates corrupted storage (array with non-strings)', () => {
    const storage = makeMemoryStorage()
    storage.setItem(STORAGE_KEY, JSON.stringify(['a', 1, null, { x: 1 }, 'b']))
    const store = new HistoryStore(50, storage)
    expect([...store.list]).toEqual(['a', 'b'])
  })

  it('falls back to null storage without throwing', () => {
    const store = new HistoryStore(50, null)
    store.append('a')
    expect([...store.list]).toEqual(['a'])
    store.clear()
    expect(store.length).toBe(0)
  })

  it('uses the default capacity when none is given', () => {
    const storage = makeMemoryStorage()
    const store = new HistoryStore(undefined, storage)
    expect(store.length).toBe(0)
    store.append('a')
    expect([...store.list]).toEqual(['a'])
    // Sanity: the constant matches what we expect.
    expect(DEFAULT_CAPACITY).toBe(500)
  })

  it('uses the default storage key when none is given', () => {
    const storage = makeMemoryStorage()
    const store = new HistoryStore(50, storage)
    store.append('a')
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['a']))
  })
})
