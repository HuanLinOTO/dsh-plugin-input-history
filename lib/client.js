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
//#region src/client/HistoryDock.tsx
/**
* Module-scope history store, initialized once on first dock mount.
* Shared with the keydown listener in `apply` via `getHistoryStore()`.
*/
let historyStore = null;
/** Get the shared history store (initializes lazily on first call). */
function getHistoryStore() {
	if (historyStore === null) historyStore = new HistoryStore(DEFAULT_CAPACITY);
	return historyStore;
}
/**
* Render the invisible history-collection dock entry.
*
* @param props - dock runtime share (InputZone owner + session kit) + locale seat.
* @returns an `aria-hidden` anchor with zero layout footprint.
*/
function HistoryDock({ session }) {
	const store = getHistoryStore();
	const lastSeenTextRef = (0, react.useRef)(null);
	const lastText = latestUserOrSteeringText(session.nodes);
	if (lastText !== null && lastText !== lastSeenTextRef.current) {
		lastSeenTextRef.current = lastText;
		store.append(lastText);
	}
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"aria-hidden": true,
		style: { display: "none" },
		"data-dsh-plugin-input-history": ""
	});
}
/**
* Extract the text of the latest `user` or `steering` node from a
* conversation snapshot's nodes list.
*
* Returns the concatenated text of all `type: 'text'` content blocks.
* Returns `null` when no user/steering node is present (e.g. a fresh
* session with only a system/context message).
*
* @param nodes - the conversation snapshot's `nodes` array.
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
//#region src/client/dom.ts
/**
* Compute the caret's line position in a textarea value.
*
* Lines are split on `\n` (the textarea's own line break character). The
* caret must be collapsed (`selectionStart === selectionEnd`) for the
* `atFirstLine` / `atLastLine` flags to be true — a non-collapsed
* selection spanning multiple lines should not trigger history navigation.
*
* @param value - the textarea's current value.
* @param selectionStart - the textarea's `selectionStart`.
* @param selectionEnd - the textarea's `selectionEnd` (defaults to `selectionStart`).
* @returns the caret's line information.
*/
function cursorLineInfo(value, selectionStart, selectionEnd = selectionStart) {
	const rawStart = Math.min(selectionStart, selectionEnd);
	const rawEnd = Math.max(selectionStart, selectionEnd);
	const clampedStart = Math.max(0, Math.min(rawStart, value.length));
	const collapsed = clampedStart === Math.max(clampedStart, Math.min(rawEnd, value.length));
	const lines = value.split("\n");
	const totalLines = lines.length;
	let currentLine = 0;
	let runningLength = 0;
	for (let i = 0; i < totalLines; i++) {
		const line = lines[i];
		const lineEnd = runningLength + line.length;
		const upperBound = i === totalLines - 1 ? lineEnd + 1 : lineEnd + 1;
		if (clampedStart >= runningLength && clampedStart < upperBound) {
			currentLine = i;
			break;
		}
		runningLength = lineEnd + 1;
	}
	return {
		currentLine,
		totalLines,
		atFirstLine: collapsed && currentLine === 0,
		atLastLine: collapsed && currentLine === totalLines - 1
	};
}
/**
* Locate the DSH composer textarea in the current document.
*
* Walks from the event target up to find the closest `[data-composer-card]`
* ancestor, then queries the descendant `<textarea>` inside it. Returns
* `null` when the target is not inside the composer card (e.g. the user
* is typing in another input or the textarea is momentarily absent).
*
* When called without an event target, falls back to a document-wide
* query — used in tests and ad-hoc probing.
*
* @param from - the event target (or any node inside the composer card).
* @returns the textarea element, or `null` when not found.
*/
function findComposerTextarea(from) {
	if (typeof document === "undefined") return null;
	if (from === void 0) return document.querySelector("[data-composer-card] textarea");
	if (from === null) return null;
	const card = from instanceof Element ? from.closest("[data-composer-card]") : null;
	if (card !== null) {
		const ta = card.querySelector("textarea");
		if (ta !== null) return ta;
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
* Navigation cursor + saved draft for the keydown listener. Module-scoped
* because the listener is attached once in `apply` and must persist across
* dock mount/unmount cycles.
*/
let navCursor = null;
let savedDraft = null;
/**
* Client plugin body: register the dock + attach the keydown listener.
*
* @param ctx - client root context.
*/
function apply(ctx) {
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "dsh-plugin-input-history: dictionaries");
	const betterLocale = ctx.get("betterLocale");
	if (betterLocale !== void 0) ctx.effect(() => betterLocale.register(NS, dicts), "dsh-plugin-input-history: better-locale override dicts");
	ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
		name: "conversation.composer.dock",
		id: "dsh-plugin-input-history",
		order: 100,
		locale: NS
	}, HistoryDock));
	ctx.effect(() => {
		if (typeof document === "undefined") return () => {};
		const handler = (event) => {
			if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
			if (isImeComposition(event)) return;
			if (event.defaultPrevented) return;
			const textarea = findComposerTextarea(event.target);
			if (textarea === null) return;
			if (event.target !== textarea) return;
			if (textarea.readOnly || textarea.disabled) return;
			const history = getHistoryStore().list;
			const info = cursorLineInfo(textarea.value, textarea.selectionStart, textarea.selectionEnd);
			if (event.key === "ArrowUp" && !info.atFirstLine) return;
			if (event.key === "ArrowDown" && !info.atLastLine) return;
			const dir = event.key === "ArrowUp" ? "up" : "down";
			const next = nextIndex(navCursor, history.length, dir);
			if (next === null) {
				const saved = savedDraft;
				navCursor = null;
				if (saved !== null) {
					setNativeTextareaValue(textarea, saved);
					savedDraft = null;
				}
				event.preventDefault();
				return;
			}
			if (navCursor === null && savedDraft === null) savedDraft = textarea.value;
			const entry = entryAt(history, next);
			if (entry === null) return;
			navCursor = next;
			setNativeTextareaValue(textarea, entry);
			event.preventDefault();
		};
		document.addEventListener("keydown", handler, false);
		return () => {
			document.removeEventListener("keydown", handler, false);
		};
	}, "dsh-plugin-input-history: keydown listener");
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
function setNativeTextareaValue(textarea, value) {
	const proto = window.HTMLTextAreaElement.prototype;
	const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
	if (descriptor === void 0 || descriptor.set === void 0) {
		textarea.value = value;
		return;
	}
	descriptor.set.call(textarea, value);
	textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });
//# sourceMappingURL=client.js.map