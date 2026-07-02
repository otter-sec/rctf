# Zag.js wrapper audit — apps/web-new (@zag-js/\* 1.41.2)

All reference material fetched at the exact installed tag `@zag-js/svelte@1.41.2` from chakra-ui/zag, plus installed dist sources under `node_modules`.

## Findings

- **[API-MISUSE]** `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/ui/tooltip.svelte:32-34` — `z-index: var(--layer-popover)` is declared on `[data-part='positioner']`, but that rule is dead: Zag's popper emits an inline `style="...z-index:var(--z-index)..."` on the positioner (inline style always wins the cascade over an author stylesheet rule), and it populates `--z-index` by copying the **content** element's computed z-index.
  - evidence: `node_modules/.bun/@zag-js+popper@1.41.2/node_modules/@zag-js/popper/dist/get-styles.mjs:42` (`floating: { ... zIndex: "var(--z-index)" }`); `get-placement.mjs:268` (`floating.style.setProperty("--z-index", getComputedStyle(contentEl).zIndex)`); `apps/web-new/node_modules/@zag-js/svelte/dist/normalize-props.js` `toStyleString` (style objects are serialized into the inline `style` attribute); official CSS at tag `shared/src/css/tooltip.css` sets z-index on `[data-scope="tooltip"][data-part="content"]` (`z-index: 1`), never on the positioner.
  - failure scenario: hover a tooltip trigger inside an open dialog — the tooltip portals to `body` with computed `z-index: auto` and paints beneath the backdrop (`--layer-backdrop`) and dialog positioner; same versus the toast group.
  - fix — move the token onto the content part and delete the positioner rule:
    ```css
    [data-part='content'] {
      z-index: var(--layer-popover);
      padding: var(--space-3xs) var(--space-2xs);
      font-size: var(--step--1);
      color: var(--foreground-l1);
      background: var(--background-l2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }
    ```

- **[STYLE]** `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/ui/dialog.svelte:50-56` — no close affordance is rendered and the `children` snippet receives no api access, so the only in-dialog escape hatches are Esc/outside-click (or a consumer wiring `bind:open`); every official example renders `api.getCloseTriggerProps()`.
  - evidence: `examples/svelte-ts/src/routes/dialog/basic/+page.svelte` and `website/data/snippets/svelte/dialog/usage.mdx` at tag both render `<button {...api.getCloseTriggerProps()}>Close</button>`.
  - fix — expose close-trigger props to consumers via the snippet:
    ```svelte
    children: Snippet<[{ closeProps: Record<string, unknown> }]>
    ...
    const closeProps = $derived(api.getCloseTriggerProps() as Record<string, unknown>)
    ...
    {@render children({ closeProps })}
    ```
    (or render a default close button inside content).

- **[STYLE]** `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/ui/portal.svelte:11-24` — diverges from the reference portal by not defaulting `container` to `globalThis?.document?.body` and not rendering in place when no container exists; inert today because `src/routes/+layout.ts` sets `ssr = false`, but matching the reference is free and future-proofs any prerendering.
  - evidence: `examples/svelte-ts/src/lib/components/portal.svelte` at tag: `let { disabled = false, container = globalThis?.document?.body, children } = $props()` … `{#if disabled || !container}{@render children()}{/if}`.
  - fix: adopt the reference's default + `{#if disabled || !container}` fallback verbatim.

## Explicitly verified CORRECT (no change needed)

- **Thunk vs object on every `useMachine`**: the adapter re-reads props only through `access(userProps)` inside `$derived` (`apps/web-new/node_modules/@zag-js/svelte/dist/machine.svelte.js:7-21`), so plain objects freeze reactive values. dialog.svelte:29 (controlled `open` → thunk ✓, matches `examples/svelte-ts/src/routes/dialog/controlled/+page.svelte` exactly, including the `onOpenChange` write-back — no loop: the machine only fires `onOpenChange` on actual transitions); tooltip.svelte:15 and toast-host.svelte:9 pass only static values (`id`, `openDelay`, `store`) as plain objects, identical to the official basic/toast examples; toast-item.svelte:14 uses a thunk over reactive `actor`/`index` ✓ (reference caches in a `$derived` then thunks it — functionally identical).
- **`connect` in `$derived`** in all four components; **prop-getter spreads** are either inline or held in `$derived` (`triggerProps`), never cached statically.
- **`$props.id()`** used for all machine ids, matching `website/data/snippets/svelte/dialog/usage.mdx` and `examples/svelte-ts/src/routes/toast/overlap/+page.svelte`.
- **`{#if api.open}` conditional rendering** for dialog and tooltip is the documented Svelte pattern (`website/data/snippets/svelte/dialog/usage.mdx`, `examples/svelte-ts/src/routes/tooltip/basic/+page.svelte`); dialog backdrop/positioner carry no inline z-index (`apps/web-new/node_modules/@zag-js/dialog/dist/dialog.connect.js:78-96`), so the app's `--layer-*` tokens apply cleanly there.
- **Toast wiring** matches `website/data/snippets/svelte/toast/usage.mdx` exactly: module-level `createStore` → group machine `{ id, store }` → `api.getToasts()` keyed by `id` → child machine thunk `{ ...actor, parent, index }`. `toast.Props`/`toast.GroupService` type names, `store.success/error/info/warning/loading/dismiss` and `translations.closeTriggerLabel` all confirmed in `apps/web-new/node_modules/@zag-js/toast/dist/index.d.ts:3` and `toast.types.d.ts:39-41,89-110,220-304`; `openDelay` confirmed at `tooltip.types.d.ts:31-34` (default 400).
- **Toast group `!important` z-index override is the correct technique**: `getGroupPlacementStyle` hardcodes inline `zIndex: MAX_Z_INDEX` (2147483647) (`apps/web-new/node_modules/@zag-js/toast/dist/toast.utils.js:64`, `dom-query/dist/shared.mjs:11`) and `ToastStoreProps` (`toast.types.d.ts:140-187`) offers no z-index option, so an `!important` author rule is the only way to beat the non-important inline style. The comment in toast-host.svelte:23 is accurate.
- **toast-item CSS** consumes exactly the documented custom properties (`--x/--y/--scale/--z-index/--height/--opacity` + `will-change` + transitions), matching the required snippet in `website/data/components/toast.mdx:375-384`; unset `--scale`/`--height` in stacked mode fall back to initial values harmlessly, same as the official CSS.

## VERDICT

The Zag layer is close to reference-grade: every `useMachine` call gets the thunk/object decision right against the actual 1.41.2 adapter source, the toast store→group→child wiring is a line-for-line match with the official Svelte snippet, and the toast-group `!important` override is the correct (and only) technique. The one real defect is the tooltip z-index: the layer token is attached to the positioner where Zag's inline popper style makes it dead — move it to the content part (highest-leverage fix, it is a genuine stacking bug under dialogs/toasts). Second, give dialog consumers a close affordance by threading `getCloseTriggerProps` through the children snippet. Third (cheap polish), align portal.svelte's container default/fallback with the reference component. Everything else audited is correct per current official sources.
