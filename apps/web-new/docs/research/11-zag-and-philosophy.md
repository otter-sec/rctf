All research is complete. Compiling the report.

# A) Zag.js + Svelte 5

## Versions (npm, checked 2026-07-01)

- `@zag-js/svelte`: **1.42.0** (latest, published 2026-06-29; deps: `@zag-js/core`, `@zag-js/types`, `@zag-js/utils` — all 1.42.0)
- `@zag-js/dialog`: **1.42.0**; all `@zag-js/*` machines version in lockstep (upgrade with `pnpm up "@zag-js/*"`)
- Peer dep: `"svelte": ">=5"`. Official example app runs svelte 5.55.9 + @sveltejs/kit 2.60.1. `$props.id()` (used for machine IDs) requires Svelte ≥5.20.
- **dist-tag `next: 2.0.0-next.0` exists** — a v2 is in development; pin to 1.x exactly.

## What Zag is

Framework-agnostic statechart-driven headless UI machines (from the Chakra UI team). One npm package per component. Completely unstyled; handles keyboard interaction, focus management, ARIA roles/attributes. Adapters for React/Solid/Vue/Svelte. Install pattern: `npm install @zag-js/<machine> @zag-js/svelte`.

## Svelte 5 integration pattern

Three primitives from `@zag-js/svelte`: `useMachine`, `normalizeProps`, `connect` (per-machine), plus exports `portal` (Svelte action), `mergeProps`, `reflect`, `useSyncExternalStore`, type `PropTypes`.

Pattern: `useMachine(machine, props)` → wrap `connect(service, normalizeProps)` in `$derived` → spread `api.get*Props()` onto elements.

**Verbatim dialog example (zagjs.com/components/svelte/dialog):**

```svelte
<script lang="ts">
  import * as dialog from '@zag-js/dialog'
  import { normalizeProps, portal, useMachine } from '@zag-js/svelte'

  const id = $props.id()
  const service = useMachine(dialog.machine, { id })
  const api = $derived(dialog.connect(service, normalizeProps))
</script>

<button {...api.getTriggerProps()}>Open Dialog</button>
{#if api.open}
  <div use:portal {...api.getBackdropProps()}></div>
  <div use:portal {...api.getPositionerProps()}>
    <div {...api.getContentProps()}>
      <h2 {...api.getTitleProps()}>Edit profile</h2>
      <p {...api.getDescriptionProps()}>
        Make changes to your profile here. Click save when you are done.
      </p>
      <div>
        <input placeholder="Enter name..." />
        <button>Save</button>
      </div>
      <button {...api.getCloseTriggerProps()}>Close</button>
    </div>
  </div>
{/if}
```

**Verbatim controlled dialog (official repo `examples/svelte-ts/src/routes/dialog/controlled/+page.svelte`):**

```svelte
<script lang="ts">
  import * as dialog from '@zag-js/dialog'
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import Portal from '$lib/components/portal.svelte'
  import Presence from '$lib/components/presence.svelte'

  let open = $state(false)

  const service = useMachine(dialog.machine, () => ({
    id: '1',
    open,
    onOpenChange(details) {
      open = details.open
    },
  }))

  const api = $derived(dialog.connect(service, normalizeProps))
</script>
```

**Critical reactivity rule** (verified in `packages/frameworks/svelte/src/machine.svelte.ts`): `useMachine`'s second arg accepts a plain object **or a thunk** `() => props`. Internally it calls `access(userProps)` inside `$derived`. Reactive/controlled props (`open`, `value`, anything from `$state`) MUST be passed as a thunk, or updates silently never reach the machine. Static props (id, callbacks) can be a plain object.

- **Uncontrolled**: pass `defaultOpen`/`defaultValue` + `on*Change` callbacks; machine owns state.
- **Controlled**: pass `open`/`value` (via thunk) + `on*Change` writing back to your `$state`.
- Machine lifecycle: starts in `onMount` (browser only); `send()` no-ops before start; cleanup in `onDestroy`.

## Portals, IDs, z-index

- `portal` is a Svelte **action** that appends the node to `document.body` (or a `container`) on mount and `node.remove()` on destroy — 15 lines, client-only. The official example app instead uses a userland `Portal.svelte` (Svelte `mount`/`unmount` + `getAllContexts` in `$effect`, renders in place when disabled) and a userland `Presence.svelte` wrapping `@zag-js/presence` for exit animations (`lazyMount`, `unmountOnExit`, `data-state` attr, `{@attach}`). Neither ships as a component in `@zag-js/svelte`; plan to vendor both (~60 lines total).
- **IDs**: pass `id: $props.id()` (SSR/hydration-stable unique ID in Svelte 5.20+). Machines accept an `ids` prop to override individual element IDs. Docs: "Provide a unique `id` prop to ensure consistent element ID generation across server and client rendering."
- **z-index**: Zag sets none. Floating machines (menu/select/popover/tooltip/hover-card/combobox) use floating-ui: positioner gets inline `position/top/left` + CSS vars (`--reference-width`, `--available-height`, arrow vars); layering is your job via portal-to-body + your own z-index tokens. Dialog backdrop/positioner are `position: fixed`; you own the z-index scale.
- Dialog options: `modal`, `closeOnInteractOutside`, `closeOnEscape`, `preventScroll`, `role: "alertdialog"`, `initialFocusEl`/`finalFocusEl` (functions returning elements).

## Toast (different shape)

Two-level: `const toaster = toast.createStore({ placement, overlap })` (module-level, callable anywhere: `toaster.create({title, type})`, `.update(id,…)`, `.dismiss()`, `.pause()`, `.resume()`) + a group machine host component: `useMachine(toast.group.machine, { id, store: toaster })`, `toast.group.connect` → `api.getToasts()` iterated with `{#each}`; each item is its own component running `useMachine(toast.machine, () => ({ ...actor, parent, index }))`.

## Select/combobox

Require a `collection`: `select.collection({ items })` passed as machine prop. Provide `api.getHiddenSelectProps()` for native-form submission. Portal the positioner.

## Machine availability

All requested machines exist as packages: **dialog, menu, select, combobox, tooltip, popover, tabs, accordion, toast, pagination, checkbox, switch, avatar, progress, splitter, tags-input, toggle-group, hover-card, number-input, pin-input, clipboard, collapsible, presence** — every one confirmed in `packages/machines/` and has a Svelte example route in the official repo.

Full machine list (50): accordion, angle-slider, async-list, avatar, carousel, cascade-select, checkbox, clipboard, collapsible, color-picker, combobox, date-input, date-picker, dialog, drawer, editable, file-upload, floating-panel, hover-card, image-cropper, listbox, marquee, menu, navigation-menu, number-input, pagination, password-input, pin-input, popover, presence, progress, qr-code, radio-group, rating-group, scroll-area, select, signature-pad, slider, splitter, steps, switch, tabs, tags-input, timer, toast, toc, toggle-group, toggle, tooltip, tour, tree-view. Utilities: focus-trap, popper, dismissable, interact-outside, remove-scroll, aria-hidden, live-region, dom-query, i18n-utils, hotkeys, auto-resize, scroll-snap.

## SSR / adapter-static behavior

- `connect()` is safe to call during SSR/prerender: it returns initial-state props (correct ARIA on static HTML). Machine `onMount` start means no interactivity until hydration — expected.
- No module-scope `document`/`window` access in the adapter; DOM work happens in effects/actions. `portal` action never runs during SSR, so during prerender an element marked `use:portal` renders **in place** in the static HTML — harmless for closed-by-default overlays behind `{#if api.open}`, but anything open-by-default will flash unportaled until hydration.
- ID stability between build-time HTML and client hydration depends on `$props.id()` determinism (SvelteKit guarantees this) — hand-rolled `Math.random()` IDs would break aria wiring.

# B) lyra.horse "You (probably) don't need JavaScript" (2025-08)

Thesis: modern CSS is a capable DSL; most interactive UI on content sites needs zero JS; CSS animations run on the compositor thread (no event-loop jank, better on low-end devices); works for users with JS disabled/hardened browsers. Recommends progressive enhancement: CSS-only baseline, JS as optional extra (e.g., theme works via `light-dark()`; JS only persists the preference).

Techniques demonstrated (with support notes as stated):

1. **CSS nesting** — baseline in all browsers since Dec 2023.
2. **Relative color syntax + `color-mix()`** — e.g. `hsl(from var(--c) h s calc(l + 10))` for hover states; "newly available."
3. **`@starting-style`** — entry transitions without keyframes; newly available.
4. **`color-scheme: light dark` + `light-dark()`** — auto light/dark including native form controls and scrollbars.
5. **`:has()`** — style ancestors/siblings from input state (`body:has(input:checked)`); scope narrowly for performance; widely available.
6. **Hidden checkbox/radio pattern** — hide with `opacity:0; position:absolute; pointer-events:none` (NOT `display:none`) to keep keyboard/SR accessibility; powers custom toggles, theme switchers.
7. **CSS-only tabs** — radio group + `:has(input:checked)` showing panels. Chrome SR bug: wrap radios in `<fieldset>`/`role="radiogroup"` for correct index announcement.
8. **`<details>/<summary>`** — accordions; `name="…"` attribute for exclusive groups; `[open]` styling; Ctrl+F finds text inside.
9. **Form validation pseudo-classes** — `:valid/:invalid` (immediate) vs `:user-valid/:user-invalid` (after interaction) + `pattern` attr regex; warning: don't use color as the only feedback.
10. **Live requirement checklists** — `:has()` on input validity styling sibling list items (password rules demo).
11. **Range media query syntax** — `@media (width < 480px)`; newly available.
12. **Viewport units `lvh/svh/dvh`** — mobile URL-bar handling; `dvh` causes layout shift, avoid for fixed elements; `interactive-widget=resizes-content` meta for on-screen keyboards.
13. **`scrollbar-gutter`**, **`lh` unit**, **`align-content: center`** for block centering.
14. **Autonomous custom elements** (`<radio-picker>`) as semantic, style-scopable markup without JS registration.
15. `:focus-visible` over `:focus`. Safari noted broken with `cqw/cqh` units. "Baseline" = all four engines, ~2.5-year window.

**NOT covered** (verified by direct query — do not attribute these to this article): popover attribute, anchor positioning, scroll-driven animations, `<dialog>`, view transitions, container queries, CSS counters, scroll-snap carousels.

JS still warranted for: complex carts/dataviz, advanced date pickers, filtered comboboxes beyond `<datalist>`, persisting preferences, API-driven content.

# C) astro-erudite v2 (enscribe) — design philosophy

Why Tailwind dropped: after native CSS "flourished," utility strings became unsustainable — cites own `'sm:has-[[data-trigger]:hover]:*:first:[&_[data-overlay]]:opacity-0'`; arbitrary-value escape hatches and `@apply` encouraged complexity. Directly inspired by the lyra.horse post (B).

Why shadcn/ui dropped: "Ownership is a principle that I now really enjoy" — shadcn's copied components still bake in Radix + Lucide deps, so "you don't really own anything." Only Avatar, ScrollArea, Pagination were used; rebuilt in-house; removed React/React-DOM/Radix → 51 fewer packages. Results: shipped JS 253kb→6.5kb (−97%), direct deps 33→13, total packages 636→294.

Replacements & principles:

- **Fluid design tokens via Utopia** (no breakpoints): `clamp()`-based type steps (`--step--1…--step-3`; viewport 328–1215px, 16px/1.125 → 18px/1.2) and space scale (`--space-m` etc.). Hierarchy: step −1 = chrome/subtext/h5-h6, 0 = body/h4, 1 = h3, 2 = h2, 3 = h1.
- **Additive line-height**: `line-height: calc(var(--leading-offset) + 1em)` (`--leading-offset: 0.65rem`) — constant line gap across font sizes.
- **Colors: Radix Colors scales mapped through native `light-dark()`** with `color-scheme: light dark` on `:root` (`--gray-1: light-dark(#fcfcfc, #111)`; semantic aliases `--primary`, `--muted-foreground` point at gray steps). System preference by default; tiny JS only to persist a manual toggle. No `.dark` class duplication.
- **Layout: fluid 12-col grid** (`page-grid` custom element, `grid-template-columns: repeat(var(--grid-columns), minmax(0,1fr))`, fluid `--grid-gutter`); regions placed by `grid-column` spans (nav 1/3, content 3/10, toc 10/13).
- **Autonomous custom elements over framework components** (`<dictionary-entry>`, `<page-nav>`): semantic tag names as styling hooks, no div-soup, no JS registration.
- **CSS file organization by responsibility**: `reset.css` (vendored Tailwind Preflight), `color.css`, `layout.css`, `fonts.css`, `typography/` split into headings/lists/tables/block/inline — replacing v1's monolith with nine `!important`s.
- **Typography**: IBM Plex Sans/Mono variable fonts, only weights 400 and 450 ("I've come to dislike heavy font weights. I also despise thin weights"); hierarchy via **opacity** (100% headings/links, 80% prose, 60% muted) not weight; `unicode-range`-subset `@font-face` + `size-adjust`/ascent/descent fallback metrics; `font-display: swap`.
- **Derived accent colors via OKLCH relative color**: one `--accent` per callout variant generates both modes: `light-dark(oklch(from var(--accent) 0.48 calc(c*1.05) h), oklch(from var(--accent) 0.83 calc(c*0.5) h))`.
- **Measure**: prose capped at `40rem` inline-size.
- Callouts as markdown directives (`:::note[Label]`) rendering `<details>/<summary>`, icons inlined at build.

# Risks (Zag + Svelte 5 + adapter-static)

1. **Thunk-vs-object trap**: passing reactive `$state` into `useMachine` as a plain object silently freezes controlled props — no error, machine just never sees updates. Enforce the `() => ({...})` convention in every controlled usage.
2. **Zag v2 on the horizon** (`2.0.0-next.0` dist-tag): API churn likely (v0→v1 already reshaped `useMachine`/`connect`). Pin exact 1.x versions; all ~20 packages must stay in lockstep — mixed versions of `@zag-js/core` vs machines break at runtime.
3. **Docs pages are flaky** (500s on /overview/composition, /overview/programmatic-control) and doc examples contain typos (`useMachine(dialog.machine, ({ id }))` — stray parens). Treat `chakra-ui/zag` repo `examples/svelte-ts/` as the source of truth.
4. **Portal + prerender flash**: the `portal` action is client-only; anything portaled AND visible in prerendered HTML renders in-place until hydration. Keep all overlays closed-by-default behind `{#if api.open}` (or vendor the mount/unmount `Portal.svelte`, which renders nothing during SSR).
5. **No shipped Portal/Presence components**: exit animations require vendoring `Presence.svelte` (uses `@zag-js/presence`, `{@attach}` — needs recent Svelte) or accepting hard unmount via `{#if api.open}` (no exit transition; pair with `@starting-style` for entry only).
6. **Interactivity gap before hydration**: machines start in `onMount`; on a static-hosted SPA the prerendered HTML has correct ARIA but dead triggers until JS loads. Acceptable for rCTF (data is client-fetched anyway), but avoid CSS that depends on machine-set data-attributes for initial layout.
7. **ID stability**: use `$props.id()` everywhere (requires Svelte ≥5.20); any nondeterministic ID breaks hydration ARIA wiring between build-time HTML and client. Multiple instances of a machine on one page each need unique `id`s.
8. **z-index/stacking is entirely yours**: Zag portals to `document.body` with no z-index; define an app-wide layer scale (backdrop < dialog < popover < toast) up front or floating elements will interleave unpredictably.
9. **`connect` must live in `$derived`** and prop-getters must be spread fresh (`{...api.getTriggerProps()}`); caching the api object outside `$derived` yields stale attributes after transitions.
10. **Toast architecture is invasive**: store must be created once and imported app-wide, plus a group-machine host in the root layout; per-toast child machines receive `parent` service — design the toast module boundary early.
11. **Select/combobox `collection` churn**: collections are constructed from items; with client-fetched challenge/team data the collection prop must be rebuilt reactively (thunk again) or options go stale.
12. **`normalizeProps` emits Svelte-flavored attributes** (lowercase `onclick`, string styles); don't hand-merge your own handlers onto prop-getters — use exported `mergeProps`.
