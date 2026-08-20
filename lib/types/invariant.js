/**
 * Package-owned invariant companion for `@huanlin/dsh-plugin-input-history`.
 *
 * @module @huanlin/dsh-plugin-input-history/invariant
 */
const PACKAGE_NAME = '@huanlin/dsh-plugin-input-history';
/** Cordis companion plugin name. */
export const name = 'dsh-plugin-input-history-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * No runtime invariant: the single `conversation.composer.dock` slot
 * registration is a registry-owned contribution whose disposal is proven
 * by the HMR-safety spec. The plugin's only mutable state is the
 * localStorage-backed history array, whose lifecycle is bounded by the
 * browser profile (not the cordis fiber) and whose write path is
 * last-writer-wins with try/catch containment.
 */
const install = () => { };
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */
