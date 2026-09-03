window.__ModuleLoader__.load({ id: "@huanlin/dsh-plugin-input-history", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react);
let react_jsx_runtime = require("react/jsx-runtime");
react_jsx_runtime = __toESM(react_jsx_runtime);

//#region src/client/history.ts
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
const STORAGE_KEY = "dsh-plugin-input-history:v1";
/** Default capacity when none is configured. */
const DEFAULT_CAPACITY = 500;
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
function appendHistory(history, prompt, capacity = DEFAULT_CAPACITY) {
	const trimmed = prompt.trim();
	if (trimmed === "") return history;
	const lastIndex = history.lastIndexOf(trimmed);
	if (lastIndex !== -1 && lastIndex === history.length - 1 && history.indexOf(trimmed) === lastIndex) return history;
	const filtered = history.filter((item) => item !== trimmed);
	filtered.push(trimmed);
	const cap = Math.max(1, capacity);
	if (filtered.length > cap) return filtered.slice(filtered.length - cap);
	return filtered;
}
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
function nextIndex(current, total, dir) {
	if (total === 0) return null;
	if (dir === "up") {
		if (current === null) return total - 1;
		if (current <= 0) return 0;
		return current - 1;
	}
	if (current === null) return null;
	if (current >= total - 1) return null;
	return current + 1;
}
/**
* Read the history entry at a cursor, or `null` when the cursor is null.
*
* @param history - the history array.
* @param cursor - the navigation cursor.
* @returns the prompt at the cursor, or `null`.
*/
function entryAt(history, cursor) {
	if (cursor === null) return null;
	if (cursor < 0 || cursor >= history.length) return null;
	return history[cursor] ?? null;
}
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
var HistoryStore = class {
	items;
	storage;
	key;
	/**
	* @param capacity - maximum entries to retain (FIFO).
	* @param storage - the storage backend (defaults to `localStorage` when available).
	* @param key - the storage key (defaults to {@link STORAGE_KEY}).
	*/
	constructor(capacity = DEFAULT_CAPACITY, storage, key = STORAGE_KEY) {
		this.capacity = capacity;
		this.storage = storage ?? safeLocalStorage();
		this.key = key;
		this.items = this.readFromStorage();
	}
	/** Current history snapshot (newest at end). */
	get list() {
		return this.items;
	}
	/** Number of entries currently stored. */
	get length() {
		return this.items.length;
	}
	/** Reload from storage (e.g. after a suspected external edit). Truncates to the current capacity. */
	reload() {
		const loaded = this.readFromStorage();
		const cap = Math.max(1, this.capacity);
		this.items = loaded.length > cap ? loaded.slice(loaded.length - cap) : loaded;
	}
	/**
	* Append a prompt and persist. See {@link appendHistory} for rules.
	* @returns the new history snapshot.
	*/
	append(prompt) {
		this.items = appendHistory(this.items, prompt, this.capacity);
		this.writeToStorage();
		return this.items;
	}
	/** Clear all history (used by tests and a future "clear" UI). */
	clear() {
		this.items = [];
		this.writeToStorage();
	}
	readFromStorage() {
		if (this.storage === null) return [];
		try {
			const raw = this.storage.getItem(this.key);
			if (raw === null) return [];
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			return parsed.filter((item) => typeof item === "string");
		} catch {
			return [];
		}
	}
	writeToStorage() {
		if (this.storage === null) return;
		try {
			this.storage.setItem(this.key, JSON.stringify(this.items));
		} catch {}
	}
};
/** Safe accessor for `localStorage` that returns null on any failure. */
function safeLocalStorage() {
	try {
		if (typeof localStorage === "undefined") return null;
		return localStorage;
	} catch {
		return null;
	}
}

//#endregion
//#region src/client/dom.ts
/**
* Pure decision over caret geometry: where a caret resting at `caretTop`
* sits relative to the box whose visual line tops are `lineTops` (ascending,
* one entry per visual line, viewport coordinates).
*
* @param caretTop - viewport `top` of the collapsed caret's box.
* @param lineTops - viewport `top` of each visual line, ascending.
* @param tolerance - px slop absorbing subpixel rounding between the caret
*   rect and its line's rect.
* @returns the boundary flags; an empty `lineTops` (empty editable) is
*   treated as a single virtual line, so both flags are true.
*/
function boundaryFromLineTops(caretTop, lineTops, tolerance) {
	if (lineTops.length === 0) return {
		atFirstLine: true,
		atLastLine: true
	};
	return {
		atFirstLine: caretTop <= lineTops[0] + tolerance,
		atLastLine: caretTop >= lineTops[lineTops.length - 1] - tolerance
	};
}
/**
* Locate the DSH composer editable the event targeted.
*
* Walks from the event target up to the closest `[data-composer-card]`
* ancestor, queries the `[data-composer-input]` contenteditable inside it,
* and confirms the target sits inside that editable (keystrokes on the
* card's buttons and chrome do not navigate history). Returns `null` when
* the target is not inside the composer editable.
*
* @param from - the event target (or any node inside the composer editable).
* @returns the editable element, or `null` when not found.
*/
function findComposerEditable(from) {
	if (typeof document === "undefined") return null;
	if (from === null || !(from instanceof Element)) return null;
	const card = from.closest("[data-composer-card]");
	if (card === null) return null;
	const editable = card.querySelector("[data-composer-input]");
	if (editable === null) return null;
	return editable.contains(from) ? editable : null;
}
/**
* Detect an open trigger (slash-command / @-mention) menu inside the
* composer card that owns `editable`.
*
* While the menu is open, ArrowUp/ArrowDown move the highlighted row and
* must not recall history. The menu renders inside the same
* `[data-composer-card]` as the editable and carries the stable
* `data-trigger-menu` marker.
*
* @param editable - the composer editable element.
* @returns the menu element, or `null` when no menu is open.
*/
function findTriggerMenu(editable) {
	const card = editable.closest("[data-composer-card]");
	return card === null ? null : card.querySelector("[data-trigger-menu]");
}
/**
* Decide the collapsed caret's line boundary inside the composer editable.
*
* Compares the caret's viewport box against the editable content's visual
* line boxes (`Range.getClientRects()` yields one rect per line fragment;
* fragments of the same visual line share a top within subpixel slop, so
* tops are deduped with a 2px threshold). A non-collapsed selection and a
* geometry-less environment (headless/jsdom) both return `null`, which the
* caller must treat as "do not navigate".
*
* @param editable - the composer editable element.
* @param tolerance - px slop between the caret rect and its line rect
*   (defaults to 4px).
* @returns the boundary flags, or `null` when they cannot be determined.
*/
function caretLineBoundary(editable, tolerance = 4) {
	const selection = window.getSelection();
	if (selection === null || selection.rangeCount === 0) return null;
	if (!selection.isCollapsed) return null;
	const caretTop = caretTopOf(selection);
	if (caretTop === null) return null;
	const lineTops = contentLineTops(editable);
	if (lineTops === null) return null;
	return boundaryFromLineTops(caretTop, lineTops, tolerance);
}
/** Viewport `top` of the collapsed caret's box, or `null` when unmeasurable. */
function caretTopOf(selection) {
	const rects = selection.getRangeAt(0).getClientRects();
	for (let i = 0; i < rects.length; i++) {
		const rect = rects[i];
		if (rect.height === 0 && rect.width === 0) continue;
		return rect.top;
	}
	const anchor = selection.anchorNode;
	const el = anchor instanceof HTMLElement ? anchor : anchor?.parentElement;
	return el === void 0 || el === null ? null : el.getBoundingClientRect().top;
}
/** Ascending, deduped tops of the editable content's visual lines; `null` without geometry. Empty for an empty editable. */
function contentLineTops(editable) {
	const range = document.createRange();
	range.selectNodeContents(editable);
	const rects = range.getClientRects();
	const tops = [];
	for (let i = 0; i < rects.length; i++) {
		const rect = rects[i];
		if (rect.height === 0 && rect.width === 0) continue;
		const top = rect.top;
		if (tops.length === 0 || Math.abs(top - tops[tops.length - 1]) > 2) tops.push(top);
	}
	return tops;
}

//#endregion
//#region src/client/ime.ts
/**
* IME-composition key guard.
*
* While a Chinese/Japanese/Korean input method is composing (the user is
* picking a candidate from the IME window), every pressed key BELONGS to
* the input method: arrows move the candidate highlight, Enter/Space
* confirm the composition, Escape cancels it. Page code must not process
* those keys — a history-navigation handler that calls `preventDefault()`
* on ArrowUp/ArrowDown during composition would silently break the IME:
* candidates stop responding, the composition gets torn apart, and only
* bare letters come out.
*
* The composition signal follows the DSH core convention (InputBar's IME
* guard, issue #535): `isComposing` for modern engines, keyCode 229 as
* the legacy signal engines emit without isComposing.
*
* @module @huanlin/dsh-plugin-input-history/client/ime
*/
/** The pure decision: is this keyboard event part of an IME composition? */
function isImeComposition(event) {
	return event.isComposing || event.keyCode === 229;
}

//#endregion
//#region src/client/HistoryDock.tsx
/**
* Module-scope history store, initialized once on first dock mount.
* Shared across dock mount/unmount cycles; the underlying data persists
* in `localStorage`.
*/
let historyStore = null;
/** Get the shared history store (initializes lazily on first call). */
function getHistoryStore() {
	if (historyStore === null) historyStore = new HistoryStore(DEFAULT_CAPACITY);
	return historyStore;
}
/**
* Render the invisible history dock entry: collection + navigation.
*
* @param props - dock runtime share (standard hooks) + locale seat.
* @returns an `aria-hidden` anchor with zero layout footprint.
*/
function HistoryDock({ useInput, useChat, inputActions, sessionId }) {
	const input = useInput((s) => s);
	const nodes = useChat((s) => s.legacy.nodes);
	const lastText = (0, react.useMemo)(() => latestUserOrSteeringText(nodes), [nodes]);
	(0, react.useEffect)(() => {
		if (lastText !== null) getHistoryStore().append(lastText);
	}, [lastText]);
	const navCursorRef = (0, react.useRef)(null);
	const savedDraftRef = (0, react.useRef)(null);
	const prevSessionRef = (0, react.useRef)(sessionId);
	if (prevSessionRef.current !== sessionId) {
		prevSessionRef.current = sessionId;
		navCursorRef.current = null;
		savedDraftRef.current = null;
	}
	const inputRef = (0, react.useRef)(input);
	inputRef.current = input;
	const actionsRef = (0, react.useRef)(inputActions);
	actionsRef.current = inputActions;
	(0, react.useEffect)(() => {
		if (typeof document === "undefined") return void 0;
		const handler = (event) => {
			if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
			if (isImeComposition(event)) return;
			if (event.defaultPrevented) return;
			if (actionsRef.current === void 0 || inputRef.current === void 0) return;
			const editable = findComposerEditable(event.target);
			if (editable === null) return;
			if (findTriggerMenu(editable) !== null) return;
			if (inputRef.current.phase !== "plain") return;
			const boundary = caretLineBoundary(editable);
			if (boundary === null) return;
			if (event.key === "ArrowUp" && !boundary.atFirstLine) return;
			if (event.key === "ArrowDown" && !boundary.atLastLine) return;
			const history = getHistoryStore().list;
			const dir = event.key === "ArrowUp" ? "up" : "down";
			const next = nextIndex(navCursorRef.current, history.length, dir);
			if (next === null) {
				const saved = savedDraftRef.current;
				navCursorRef.current = null;
				if (saved !== null) {
					actionsRef.current.setDraft(saved);
					savedDraftRef.current = null;
				}
				consume(event);
				return;
			}
			if (navCursorRef.current === null && savedDraftRef.current === null) savedDraftRef.current = inputRef.current.draft;
			const entry = entryAt(history, next);
			if (entry === null) return;
			navCursorRef.current = next;
			actionsRef.current.setDraft(entry);
			consume(event);
		};
		document.addEventListener("keydown", handler, true);
		return () => {
			document.removeEventListener("keydown", handler, true);
		};
	}, []);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"aria-hidden": true,
		style: { display: "none" },
		"data-dsh-plugin-input-history": ""
	});
}
/**
* Consume a navigated keystroke: `preventDefault` stops the browser's own
* gesture, `stopPropagation` (capture phase, document level) keeps the
* event from ever reaching Lexical's editable keydown listener — otherwise
* the keymap would move the caret after the draft was already replaced.
*/
function consume(event) {
	event.preventDefault();
	event.stopPropagation();
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
function latestUserOrSteeringText(nodes) {
	for (let i = nodes.length - 1; i >= 0; i--) {
		const node = nodes[i];
		if (node.kind !== "user" && node.kind !== "steering") continue;
		const content = node.content;
		if (content === void 0) continue;
		let text = "";
		for (const block of content) if (block.type === "text" && typeof block.text === "string") text += block.text;
		return text;
	}
	return null;
}

//#endregion
//#region src/client/locales.ts
/** Locale namespace id (matches the cordis.patch.yml plugin id). */
const NS = "dsh-plugin-input-history";
/** English dictionary. */
const en = {
	ariaLabel: "Prompt history navigation (ArrowUp/ArrowDown)",
	restoredDraft: "Restored in-progress draft",
	noHistory: "No prompt history yet"
};
/** Chinese dictionary. */
const zh = {
	ariaLabel: "提示词历史导航（上/下方向键）",
	restoredDraft: "已恢复正在编辑的草稿",
	noHistory: "暂无提示词历史"
};

//#endregion
//#region src/client/dictionaries.ts
const ja = {
	ariaLabel: "プロンプト履歴のナビゲーション（↑/↓キー）",
	restoredDraft: "編集中の下書きを復元しました",
	noHistory: "プロンプト履歴はまだありません"
};
const de = {
	ariaLabel: "Befehlsverlauf-Navigation (Pfeil hoch/runter)",
	restoredDraft: "In Bearbeitung befindlicher Entwurf wiederhergestellt",
	noHistory: "Noch kein Befehlsverlauf vorhanden"
};
const fr = {
	ariaLabel: "Navigation dans l'historique des invites (flèche haut/bas)",
	restoredDraft: "Brouillon en cours d'édition restauré",
	noHistory: "Pas encore d'historique d'invites"
};
const pt = {
	ariaLabel: "Navegação no histórico de prompts (seta para cima/baixo)",
	restoredDraft: "Rascunho em edição restaurado",
	noHistory: "Ainda não há histórico de prompts"
};
const ko = {
	ariaLabel: "프롬프트 기록 탐색 (위/아래 화살표)",
	restoredDraft: "편집 중이던 초안을 복원했습니다",
	noHistory: "아직 프롬프트 기록이 없습니다"
};
const ar = {
	ariaLabel: "التنقل في سجل الأوامر (السهم لأعلى/لأسفل)",
	restoredDraft: "تمت استعادة المسودة قيد التحرير",
	noHistory: "لا يوجد سجل أوامر بعد"
};
const hi = {
	ariaLabel: "प्रॉम्प्ट इतिहास नेविगेशन (ऊपर/नीचे तीर)",
	restoredDraft: "संपादन में मौजूद ड्राफ्ट पुनर्स्थापित किया गया",
	noHistory: "अभी तक कोई प्रॉम्प्ट इतिहास नहीं"
};
const id = {
	ariaLabel: "Navigasi riwayat prompt (panah atas/bawah)",
	restoredDraft: "Draf yang sedang diedit dipulihkan",
	noHistory: "Belum ada riwayat prompt"
};
const tr = {
	ariaLabel: "Komut geçmişinde gezinme (yukarı/aşağı ok)",
	restoredDraft: "Düzenlenmekte olan taslak geri yüklendi",
	noHistory: "Henüz komut geçmişi yok"
};
const vi = {
	ariaLabel: "Điều hướng lịch sử lệnh (mũi tên lên/xuống)",
	restoredDraft: "Đã khôi phục bản nháp đang soạn",
	noHistory: "Chưa có lịch sử lệnh"
};
const th = {
	ariaLabel: "นำทางประวัติคำสั่ง (ลูกศรขึ้น/ลง)",
	restoredDraft: "กู้คืนฉบับร่างที่กำลังแก้ไขแล้ว",
	noHistory: "ยังไม่มีประวัติคำสั่ง"
};
const ru = {
	ariaLabel: "Навигация по истории запросов (стрелки вверх/вниз)",
	restoredDraft: "Текущий черновик восстановлен",
	noHistory: "Истории запросов пока нет"
};
const it = {
	ariaLabel: "Navigazione cronologia prompt (freccia su/giù)",
	restoredDraft: "Bozza in corso ripristinata",
	noHistory: "Nessuna cronologia prompt finora"
};
const nl = {
	ariaLabel: "Navigatie door promptgeschiedenis (pijl omhoog/omlaag)",
	restoredDraft: "Lopende concept hersteld",
	noHistory: "Nog geen promptgeschiedenis"
};
const sv = {
	ariaLabel: "Navigera i prompthistorik (pil upp/ner)",
	restoredDraft: "Utkast under arbete återställt",
	noHistory: "Ingen prompthistorik ännu"
};
const pl = {
	ariaLabel: "Nawigacja po historii promptów (strzałka w górę/w dół)",
	restoredDraft: "Przywrócono edytowany szkic",
	noHistory: "Brak jeszcze historii promptów"
};
const zhHK = {
	ariaLabel: "提示詞歷史導覽（上/下方向鍵）",
	restoredDraft: "已還原正在編輯的草稿",
	noHistory: "暫無提示詞歷史"
};
const zhTW = {
	ariaLabel: "提示詞歷史導覽（上/下方向鍵）",
	restoredDraft: "已還原正在編輯的草稿",
	noHistory: "暫無提示詞歷史"
};
const zhMO = {
	ariaLabel: "提示詞歷史導覽（上/下方向鍵）",
	restoredDraft: "已還原正在編輯的草稿",
	noHistory: "暫無提示詞歷史"
};
/**
* All override dictionaries, keyed by language id, covering the full key
* set. Registered with better-locale under the plugin namespace.
*/
const dicts = {
	ja,
	de,
	fr,
	pt,
	ko,
	ar,
	hi,
	id,
	tr,
	vi,
	th,
	ru,
	it,
	nl,
	sv,
	pl,
	"zh-HK": zhHK,
	"zh-TW": zhTW,
	"zh-MO": zhMO
};

//#endregion
//#region src/client/index.ts
/** Required services: slots + locale. */
const inject = ["slots", "locale"];
/**
* Client plugin body: register the dock + locale dictionaries.
*
* @param ctx - client root context.
*/
function apply(ctx) {
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "dsh-plugin-input-history: dictionaries");
	ctx.effect(() => {
		let dispose;
		const sync = () => {
			dispose?.();
			dispose = void 0;
			const store = ctx.get("betterLocale");
			if (store !== void 0) dispose = store.register(NS, dicts);
		};
		sync();
		const unsubscribe = ctx.locale.subscribe(sync);
		return () => {
			unsubscribe();
			dispose?.();
		};
	}, "dsh-plugin-input-history: better-locale override dicts");
	ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
		name: "conversation.composer.dock",
		id: "dsh-plugin-input-history",
		order: 100,
		locale: NS
	}, HistoryDock));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });
//# sourceMappingURL=client.js.map