import { jsx as _jsx } from "react/jsx-runtime";
/**
 * HistoryDock — invisible dock entry that collects prompt history.
 *
 * Registers as a `conversation.composer.dock` list entry and renders an
 * `aria-hidden` anchor (zero layout footprint). The dock's only job is
 * history collection: every render reads `props.session.nodes` and
 * appends new user/steering text to the module-scope `HistoryStore`.
 *
 * The keydown listener that drives navigation lives in `apply` (module
 * scope), NOT in this dock — because the dock is session-scoped and
 * DSH treats blank sessions as "hero" (ConversationRoot.tsx:79-80),
 * which suppresses the dock entirely (`!hero` guard at line 156).
 * Moving the listener to `apply` ensures it is always attached,
 * regardless of hero/blank/active session state.
 *
 * @module @huanlin/dsh-plugin-input-history/client/HistoryDock
 */
import { useRef } from 'react';
import { HistoryStore, DEFAULT_CAPACITY } from "./history.js";
/**
 * Module-scope history store, initialized once on first dock mount.
 * Shared with the keydown listener in `apply` via `getHistoryStore()`.
 */
let historyStore = null;
/** Get the shared history store (initializes lazily on first call). */
export function getHistoryStore() {
    if (historyStore === null) {
        historyStore = new HistoryStore(DEFAULT_CAPACITY);
    }
    return historyStore;
}
/**
 * Render the invisible history-collection dock entry.
 *
 * @param props - dock runtime share (InputZone owner + session kit) + locale seat.
 * @returns an `aria-hidden` anchor with zero layout footprint.
 */
export function HistoryDock({ session }) {
    const store = getHistoryStore();
    // History collection: diff the last user/steering text against the
    // previously-seen tail and append on change. Runs every render (cheap:
    // O(n) over the tail nodes, breaks early once a user/steering node is
    // found). The store dedupes internally, so re-appends are no-ops.
    const lastSeenTextRef = useRef(null);
    const lastText = latestUserOrSteeringText(session.nodes);
    if (lastText !== null && lastText !== lastSeenTextRef.current) {
        lastSeenTextRef.current = lastText;
        store.append(lastText);
    }
    // `display: none` keeps the anchor out of layout and out of the
    // a11y tree. The dock is purely a lifecycle anchor for history
    // collection; the keydown listener lives in `apply`.
    return _jsx("div", { "aria-hidden": true, style: { display: 'none' }, "data-dsh-plugin-input-history": "" });
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
        if (node.kind !== 'user' && node.kind !== 'steering')
            continue;
        const content = node.content;
        if (content === undefined)
            continue;
        let text = '';
        for (const block of content) {
            if (block.type === 'text' && typeof block.text === 'string') {
                text += block.text;
            }
        }
        return text;
    }
    return null;
}
