# dsh-plugin-input-history — Agent Guide

## Plugin overview

Bundle-style DSH plugin that adds terminal-style prompt history navigation to the DSH composer. ArrowUp cycles to the previous sent prompt, ArrowDown to the next (or restores the in-progress draft when past the newest entry). History is collected from `user` + `steering` conversation nodes across all sessions and persisted to `localStorage` (FIFO, 500 entries).

The plugin is **client-only** (host `apply` is empty). The browser half registers an invisible entry in `conversation.composer.dock` and attaches a document-level bubble-phase `keydown` listener that intercepts ArrowUp/ArrowDown on the composer textarea.

## Key conventions

- **Bundle form**: `cordis.patch.yml` inserts one plugin row with no config; `package.json` has `dsh.bundle.patch`. No source patches to DSH staging.
- **Client-only**: the host half (`src/index.ts`) has an empty `apply`. All work is in the browser half (`src/client/`).
- **Single slot registration**: `conversation.composer.dock` (list, session scope, id `dsh-plugin-input-history`, order 100). The dock entry renders an invisible `display: none` anchor; the actual work is in a `document.addEventListener('keydown', ...)` listener attached once per dock mount.
- **Pre-built `lib/` strategy**: `lib/` is committed (not in `.gitignore`); no `prepare` script; `github:` install works out of the box. Required because the client half depends on `@deepseek-ai/dsh-client-*` private peer deps that pnpm cannot fetch in a temporary git-install directory.
- **Peer deps**: cordis + react + react-dom + `@deepseek-ai/dsh-client-*` (provided by host). Zero runtime npm deps.
- **Pure functions for testability**: `history.ts`, `dom.ts`, `ime.ts` are pure (no React, no localStorage side effects in the functions themselves — `HistoryStore` wraps them with storage access). Unit tests cover them without jsdom where possible (history.spec.ts and ime.spec.ts run in node; dom.spec.ts opts into jsdom via a per-file pragma).

## File responsibilities

| File | Role |
|------|------|
| `src/index.ts` | Host entry: `name`, empty `apply` (client-only plugin) |
| `src/invariant.ts` | `./invariant` companion (empty installer: slot registration is HMR-proven; localStorage writes are try/catch contained) |
| `src/client/index.ts` | Client entry: `inject = ['slots', 'locale']`, registers `conversation.composer.dock` entry + locale namespace |
| `src/client/HistoryDock.tsx` | The dock component: invisible anchor + document-level keydown listener + history collection from `session.nodes` |
| `src/client/history.ts` | Pure functions: `appendHistory` / `nextIndex` / `entryAt` + `HistoryStore` class (localStorage backend, quota-resilient) |
| `src/client/dom.ts` | Pure functions: `cursorLineInfo` (multi-line boundary check) + `findComposerTextarea` (DOM query via `data-composer-card`) |
| `src/client/ime.ts` | Pure function: `isImeComposition` (IME composition guard, DSH core convention issue #535) |
| `src/client/locales.ts` | English + Chinese dictionaries for the `dsh-plugin-input-history` namespace |
| `tests/history.spec.ts` | Unit tests for `appendHistory` / `nextIndex` / `entryAt` / `HistoryStore` |
| `tests/dom.spec.ts` | Unit tests for `cursorLineInfo` / `findComposerTextarea` (jsdom) |
| `tests/ime.spec.ts` | Unit tests for `isImeComposition` |

## Commands

```sh
pnpm run typecheck    # tsc --noEmit (resolves DSH src through ../dsh paths)
pnpm test             # vitest run (pure-function unit tests)
pnpm run build        # tsc + tsdown → lib/index.js, lib/invariant.js, lib/client.js
pnpm run bundle:client # tsdown only (skip tsc; for fast client rebuilds)
```

## Data flow

### History collection (every dock render)

1. Dock receives `session: ConversationSnapshot` as a dock owner prop (point-in-time snapshot).
2. `latestUserOrSteeringText(session.nodes)` walks the nodes array from the end, finds the first `kind === 'user'` or `kind === 'steering'` node, concatenates its `content` text blocks.
3. Diff against `lastSeenTextRef.current`; if different, `store.append(text)`.
4. `appendHistory` rules: empty/whitespace ignored, latest-equal no-op, earlier occurrence removed (recency wins), FIFO drop on overflow.
5. `HistoryStore` writes to `localStorage` inside try/catch; quota exception leaves the in-memory copy authoritative.

### Navigation (keydown handler)

1. Filter: only `ArrowUp` / `ArrowDown`.
2. IME guard: `event.isComposing || keyCode === 229` → return.
3. Slash-menu-open guard: `event.defaultPrevented` → return (InputBar already routed to menu highlight).
4. Locate textarea: `findComposerTextarea(event.target)` walks up to `[data-composer-card]` ancestor, queries `textarea` descendant.
5. Target check: `event.target !== textarea` → return (exclude clicks on card chrome).
6. Phase gate: `input.phase !== 'plain'` → return (do not interfere with submit transaction).
7. Multi-line boundary: `cursorLineInfo(value, selStart, selEnd)`; ArrowUp requires `atFirstLine`, ArrowDown requires `atLastLine`.
8. Compute next cursor: `nextIndex(cursor, total, dir)`.
9. If next is null (fell off newest end): restore `savedDraftRef` via `inputActions.setDraft(saved)`, clear cursor + saved draft.
10. Otherwise: save current draft to `savedDraftRef` on first navigation; `inputActions.setDraft(entry)`; `event.preventDefault()`.

### Session switch

When `props.sessionId` changes between renders, the dock resets `cursorRef` and `savedDraftRef` to null. The saved draft belonged to the previous session's composer and must not be restored into the new one.

## Gotchas

- The dock registers in `conversation.composer.dock` (under the composer card), not `conversation.input.dock` (above the card). Either works for an invisible anchor; the choice mirrors `dsh-spur` / `dsh-auto-blame`.
- The keydown listener is attached in the **bubble phase** (`false` for `useCapture`), not the capture phase. This is deliberate: React 18 attaches its delegated handlers at the root container, so the bubble-phase document listener fires AFTER InputBar's `onKeyDown`, allowing the `event.defaultPrevented` heuristic to see whether InputBar already consumed the event (slash menu open).
- The dock is `display: none`, not `visibility: hidden` or `opacity: 0`. `display: none` removes the element from layout AND the accessibility tree, so `aria-label` would be ignored — that's why the anchor has no `aria-label`. The locale seat is registered for future settings-row copy.
- `inputActions` is stable per session (per the slot system contract), so the keydown handler can capture it once and not re-attach on every render. The handler reads `phase` and `draft` through a ref refreshed each render.
- The history store is constructed lazily on first dock mount (`useRef` initializer). HMR / dock remount creates a new store, but `localStorage` is re-read on construction, so the in-memory state recovers from storage. This is acceptable because history is append-mostly and a stale in-memory copy only loses the very last un-persisted append (which is impossible in practice — appends are synchronous to storage).
- `capacity` is hardcoded (500) rather than threaded from a Config field. Config plumbing from host `apply` to client `apply` requires an RPC channel (client and host bundles have separate module scopes). The hardcoded value matches `dsh-spur`'s hardcoded whip-threshold pattern; see README "Known limitations" for the rationale.
- The dock does not call `keyboard.track()` after `setDraft`. `keyboard.track` is a package-internal method of `ui-conversation`'s `SessionInputShell` and is not exposed across plugin boundaries. The machine's diff scan restores the surface, but slash-menu trigger detection does not run until the user types or moves the caret again. For history navigation this is acceptable: the user typically edits or sends immediately after picking a history entry.
