# dsh-plugin-input-history — Agent Guide

## Plugin overview

Bundle-style DSH plugin that adds terminal-style prompt history navigation to the DSH composer. ArrowUp cycles to the previous sent prompt, ArrowDown to the next (or restores the in-progress draft when past the newest entry). History is collected from `user` + `steering` chat nodes across all sessions and persisted to `localStorage` (FIFO, 500 entries).

The plugin is **client-only** (host `apply` is empty). The browser half registers an invisible entry in `conversation.composer.dock`; that dock component both collects history (via `useChat`) and attaches a document-level **capture-phase** `keydown` listener that intercepts ArrowUp/ArrowDown on the composer's Lexical contenteditable and writes through `inputActions.setDraft`.

Adapted to DSH v0.1.2-rc.1 (rc.1 removed the `conversation.composer.dock` InputZone owner: `input` is read via the standard `useInput` hook; empty `./invariant` companion dropped per the tightened upstream invariant rule) (composer is Lexical; `dsh-client-runtime` is gone; chat nodes live in `dsh-client-ui-chat`).

## Key conventions

- **Bundle form**: `cordis.patch.yml` inserts one plugin row with no config; `package.json` has `dsh.bundle.patch`. No source patches to DSH staging.
- **Client-only**: the host half (`src/index.ts`) has an empty `apply`. All work is in the browser half (`src/client/`).
- **Single slot registration**: `conversation.composer.dock` (list, session scope, id `dsh-plugin-input-history`, order 100). The dock entry renders an invisible `display: none` anchor; both the history collection and the keydown listener live in the dock component.
- **Pre-built `lib/` strategy**: `lib/` is committed (not in `.gitignore`); no `prepare` script; `github:` install works out of the box. Required because the client half depends on `@deepseek-ai/dsh-client-*` private peer deps that pnpm cannot fetch in a temporary git-install directory.
- **Peer deps**: cordis + react + react-dom + `@deepseek-ai/dsh-client-*` (provided by host). Zero runtime npm deps.
- **Alpha dev setup**: `@deepseek-ai/*` alpha versions are not on npm, so `peerDependencies` declare `^0.1.2-rc.1` (declaration only) while local typecheck resolves types through tsconfig `paths` pointing at `C:/Users/Administrator/.dsh/source/current/packages/*/lib/types`, and `node_modules/@deepseek-ai/*` are junctions into that checkout. `pnpm-workspace.yaml` pins `autoInstallPeers: false` (pnpm 10 reads the setting there, not from `.npmrc`).
- **Pure functions for testability**: `history.ts`, `dom.ts` (pure decision core), `ime.ts` are unit-tested without DOM geometry (dom.spec.ts opts into jsdom via a per-file pragma).

## File responsibilities

| File | Role |
|------|------|
| `src/index.ts` | Host entry: `name`, empty `apply` (client-only plugin) |
| `src/client/index.ts` | Client entry: `inject = ['slots', 'locale']`, registers `conversation.composer.dock` entry + locale namespace |
| `src/client/HistoryDock.tsx` | The dock component: invisible anchor + history collection via `useChat` + capture-phase document keydown listener navigating via `inputActions.setDraft` |
| `src/client/history.ts` | Pure functions: `appendHistory` / `nextIndex` / `entryAt` + `HistoryStore` class (localStorage backend, quota-resilient) |
| `src/client/dom.ts` | Composer-adjacent DOM helpers: `findComposerEditable` / `findTriggerMenu` (stable data-attribute locators) + `caretLineBoundary` (caret-vs-line-box geometry) + `boundaryFromLineTops` (pure decision core) |
| `src/client/ime.ts` | Pure function: `isImeComposition` (IME composition guard, DSH core convention issue #535) |
| `src/client/locales.ts` | English + Chinese dictionaries for the `dsh-plugin-input-history` namespace |
| `tests/history.spec.ts` | Unit tests for `appendHistory` / `nextIndex` / `entryAt` / `HistoryStore` |
| `tests/dom.spec.ts` | Unit tests for `boundaryFromLineTops` + the locators (jsdom) |
| `tests/ime.spec.ts` | Unit tests for `isImeComposition` |

## Commands

```sh
pnpm run typecheck    # tsc --noEmit (resolves DSH types through tsconfig paths + node_modules junctions)
pnpm test             # vitest run (pure-function unit tests)
pnpm run build        # tsdown + tsc → lib/index.js, lib/client.js, lib/types/
pnpm run bundle:client # tsdown only (skip tsc; for fast client rebuilds)
```

## Data flow

### History collection (per Chat update)

1. The dock reads the Chat target's legacy node slice: `useChat(s => s.legacy.nodes)` (`ChatSnapshot.legacy.nodes`, a plain `ConversationNode` list, newest last).
2. `latestUserOrSteeringText(nodes)` walks the array from the end, finds the first `kind === 'user'` or `kind === 'steering'` node, concatenates its `content` text blocks.
3. A `useEffect` keyed on that text appends it to the module-scope `HistoryStore`. The store dedupes internally (latest-equal is a no-op), so repeated appends of an unchanged tail are free.
4. `appendHistory` rules: empty/whitespace ignored, latest-equal no-op, earlier occurrence removed (recency wins), FIFO drop on overflow.
5. `HistoryStore` writes to `localStorage` inside try/catch; quota exception leaves the in-memory copy authoritative.

### Navigation (capture-phase keydown handler)

1. Filter: only `ArrowUp` / `ArrowDown`.
2. IME guard: `event.isComposing || keyCode === 229` → return.
3. Already-prevented guard: `event.defaultPrevented` → return.
4. Locate the editable: `findComposerEditable(event.target)` walks up to `[data-composer-card]`, queries `[data-composer-input]`, and requires the target inside it (card chrome keystrokes are excluded).
5. Menu-open guard: `findTriggerMenu(editable)` looks for `[data-trigger-menu]` inside the same card — when the slash/@ menu is open, arrows belong to its highlight arbitration.
6. Phase gate: `input.phase !== 'plain'` → return (do not interfere with the submit transaction).
7. Multi-line boundary: `caretLineBoundary(editable)` compares the collapsed caret rect against the content's line-box tops; ArrowUp requires `atFirstLine`, ArrowDown requires `atLastLine`; no geometry → do not navigate.
8. Compute next cursor: `nextIndex(cursor, total, dir)`.
9. If next is null (fell off newest end): restore `savedDraftRef` via `inputActions.setDraft(saved)`, clear cursor + saved draft.
10. Otherwise: save the current draft (`input.draft`, the clipboard projection) to `savedDraftRef` on first navigation; `inputActions.setDraft(entry)`.
11. Consume the event: `preventDefault()` + `stopPropagation()`.

### Session switch

When `props.sessionId` changes between renders, the dock resets the cursor and saved-draft refs (render-phase ref write). The saved draft belonged to the previous session's composer and must not be restored into the new one.

## Gotchas

- **Capture phase is mandatory.** The composer is a Lexical contenteditable: its keymap (`ui-conversation`'s `registerComposerKeymap`) moves the caret synchronously in JS from a keydown listener on the editable element. A bubble-phase listener would run after the caret already moved; the document-level capture listener runs before everything below, and `stopPropagation()` keeps the event from ever reaching Lexical.
- **The dock registers in `conversation.composer.dock`** (below the composer card), not `conversation.input.dock` (above the card). Either works for an invisible anchor; the choice mirrors `dsh-spur` / `dsh-auto-blame`. ui-chat's StatsLine (`id: 'stats'`, order 0) coexists in the same list.
- **Writes go through `inputActions.setDraft`, not the DOM.** `setDraft` is the machine's public whole-draft write (Lexical update, caret to end, `HISTORY_MERGE_TAG` undo semantics). There is no textarea to drive with native setters anymore. Note: a draft containing reference chips is restored as its clipboard-projection text (chips become their `/name` form).
- **Menu deferral is a marker check, not `defaultPrevented`.** Capture phase runs before the keymap's arbitration could set `defaultPrevented`, so the handler checks the stable `data-trigger-menu` marker inside the composer card instead.
- **Hero/blank dormancy.** DSH suppresses `conversation.composer.dock` for blank sessions (hero). The dock is the listener's lifecycle owner, so the plugin is dormant there — and navigation could not work anyway: the input machine (and `inputActions`) only exists for a current session. History collection equally only runs in active sessions; the first message is collected once the session becomes active.
- The dock is `display: none`, not `visibility: hidden` or `opacity: 0`. `display: none` removes the element from layout AND the accessibility tree, so `aria-label` would be ignored — that's why the anchor has no `aria-label`. The locale seat is registered for future settings-row copy.
- `inputActions` is stable per session (one identity per `SessionInputShell`), so the keydown handler is attached once per dock mount and reads `input`/`inputActions` through refs refreshed each render.
- The history store is constructed lazily on first dock mount (`getHistoryStore()`). HMR / dock remount creates a new store, but `localStorage` is re-read on construction, so the in-memory state recovers from storage.
- `capacity` is hardcoded (500) rather than threaded from a Config field. Config plumbing from host `apply` to client `apply` requires an RPC channel (client and host bundles have separate module scopes). The hardcoded value matches `dsh-spur`'s hardcoded whip-threshold pattern; see README "Known limitations" for the rationale.
- **DOM markers are internal upstream attributes**: `[data-composer-card]`, `[data-composer-input]`, `[data-trigger-menu]`. They are stable but undocumented; the locators in `dom.ts` are the single point to update if upstream renames them.
