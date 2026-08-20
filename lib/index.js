//#region src/index.ts
const name = "dsh-plugin-input-history";
const inject = [];
/**
* Host apply — no-op. The history navigation is a pure client-side UI
* contribution; no host-side resources are used.
* @param _ctx - host context (unused).
*/
function apply(_ctx) {}

//#endregion
export { apply, inject, name };