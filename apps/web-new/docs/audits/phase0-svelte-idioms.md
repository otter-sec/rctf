All files read, docs fetched, autofixer run. Findings report follows.

# Svelte 5 idiom audit — apps/web-new (svelte 5.55.7 installed)

## Findings

- **[API-MISUSE] src/lib/ui/portal.svelte:17** — `mount(children, …)` passes a `Snippet` where `mount` is typed and documented to take a _component_; it only works because compiled snippets happen to share the component calling convention, an internal implementation detail.
  - evidence: installed types `apps/web-new/node_modules/svelte/types/index.d.ts:280-296` — the `Snippet` interface is branded _"You can only call a snippet through the `{@render ...}` tag"_, and `mount` (line 539) accepts `ComponentType | Component`, not `Snippet`. Svelte docs _imperative-component-api_: "mount — Instantiates a **component**". Svelte docs _{@attach}_: attachments run in an effect on element mount, may return cleanup, and re-run when state read inside changes — the documented primitive for direct DOM manipulation like relocating a node. The attachment approach also makes `getAllContexts()` plumbing unnecessary because children stay in the normal component tree.
  - fix (drop-in; keeps the `disabled`/`container` API used by dialog/tooltip/toast-host):

    ```svelte
    <script lang="ts">
      import type { Snippet } from 'svelte'

      type Props = {
        disabled?: boolean
        container?: HTMLElement
        children: Snippet
      }

      let { disabled = false, container, children }: Props = $props()
    </script>

    {#if disabled}
      {@render children()}
    {:else}
      <portal-root
        {@attach node => {
          ;(container ?? document.body).appendChild(node)
          return () => node.remove()
        }}
      >
        {@render children()}
      </portal-root>
    {/if}

    <style>
      portal-root {
        display: contents;
      }
    </style>
    ```

- **[BUG] src/lib/components/markdown.svelte:53-65** — the `onMount` + `$effect` + `queueMicrotask` triple path hydrates every island **twice on initial render** (onMount hydrates, then the effect's first run queues a microtask that unmounts everything and remounts it), and the microtask deferral the comment justifies is unnecessary per current docs.
  - evidence: Svelte docs _$effect → Understanding lifecycle_: "Your effects run after the component has been mounted to the DOM, and in a microtask after state changes… and **happen after any DOM updates have been applied**" — so when `html` changes, the `{@html}` DOM is already committed when the effect body runs; and "An effect can return a _teardown function_ which will run immediately before the effect re-runs [or] when the component is destroyed" — which replaces the `destroyed` flag and the manual `mounted` bookkeeping entirely.
  - fix (replaces lines 13-15 and 53-65; `hydrate()` becomes the effect body):

    ```svelte
    let container: HTMLElement
    const html = $derived(parseMarkdown(content))

    $effect(() => {
      html
      const instances = [
        ...[...container.querySelectorAll('[data-alert]')].map(el =>
          mount(MarkdownAlert, {
            target: el,
            props: {
              type: getAlertType(el),
              content: el.getAttribute('data-content') ?? '',
              parsedContent: parseAlertContent(el.getAttribute('data-content') ?? ''),
            },
          })
        ),
        ...[...container.querySelectorAll('[data-timer]')].map(el =>
          mount(MarkdownTimer, { target: el })
        ),
      ]
      return () => instances.forEach(instance => unmount(instance))
    })
    ```

    Delete the `onMount` import/block, `mounted`, `destroyed`, and `hydrate()`. (The `mount()`-per-island approach itself is correct — `{@html}` DOM is outside Svelte's tree, so imperative mounting is the right tool here.)

- **[ANTI-PATTERN] src/lib/components/markdown-timer.svelte:11-13** — `setInterval` started during component init with a separate `onDestroy` is exactly the pattern the docs model as a single `$effect` with teardown (or `SvelteDate`); the interval also ticks forever after the CTF ends, and init-time side effects would fire under SSR if this component is ever server-rendered.
  - evidence: Svelte docs _$effect_ ("Effect teardown" example is literally `setInterval` + `clearInterval` in the returned teardown; "They only run in the browser, not during server-side rendering"); _lifecycle-hooks → onMount_ shows the same interval-with-cleanup shape; _svelte/reactivity → SvelteDate_ documents the interval-driven clock alternative. Conditional dependencies ("An effect only depends on the values that it read the last time it ran") let the effect shut itself off when `hasEnded` flips.
  - fix (replace lines 3, 11-13):

    ```ts
    let now = $state(Date.now())

    $effect(() => {
      if (isArchived || hasEnded) return
      const interval = setInterval(() => (now = Date.now()), 1000)
      return () => clearInterval(interval)
    })
    ```

    and drop the `onDestroy` import.

- **[ANTI-PATTERN] src/lib/ui/empty-state.svelte:13-14** — disambiguating `Snippet | Component` by inspecting `icon.length` (compiled function arity) depends on the same private snippet/component calling convention as the portal finding; it will silently misroute if the compiler output changes.
  - evidence: `apps/web-new/node_modules/svelte/types/index.d.ts:280-296` — snippets are deliberately opaque ("You can only call a snippet through the `{@render ...}` tag"); nothing in _$props_ or _snippet_ docs sanctions arity introspection. All icons in `src/lib/icons/` are components, and the component has zero consumers yet, so the union buys nothing.
  - fix: narrow the prop to one documented kind:

    ```svelte
    <script lang="ts">
      import type { Component } from 'svelte'

      type Props = {
        icon?: Component
        title: string
        subtitle?: string
      }

      let { icon: Icon, title, subtitle }: Props = $props()
    </script>

    <empty-state>
      {#if Icon}
        <Icon />
      {/if}
      ...
    ```

    (If snippet callers materialize later, add a separate `iconSnippet?: Snippet` prop instead of sniffing.)

- **[BUG] src/lib/components/markdown-alert.svelte:36-48** — the `copied`-reset `setTimeout` is never cleared on unmount, so it fires against a destroyed component (harmless state write, but a dangling timer and an un-idiomatic escape from Svelte's cleanup model).
  - evidence: Svelte docs _lifecycle-hooks → onMount_ / _$effect_: cleanup callbacks returned from `onMount`/effects are the documented home for timer teardown ("if a teardown function is provided, it will run … when the component is destroyed").
  - fix (minimal, preserves the restart-on-reclick behavior):

    ```ts
    import { onDestroy } from 'svelte'

    // ...
    onDestroy(() => clearTimeout(timeout))
    ```

- **[STYLE] src/lib/forms/use-api-form.svelte.ts:34-49** — immutable spread/`delete`-copy updates (`data = { ...data, ...values }`, `errors = { ...errors, [field]: message }`, clone-then-delete in `setError`) fight the `$state` deep proxy, which is documented to support direct granular mutation.
  - evidence: Svelte docs _$state → Deep state_: "modifying an individual … property will trigger updates to anything in your UI that depends on that specific property" — proxies trap property writes and deletes, so per-field mutation is the idiomatic (and more granular) update path.
  - fix:

    ```ts
    function setData(values: Partial<Data>) {
      Object.assign(data, values)
    }

    function setError(field: keyof Data | '_form', message: string | null) {
      if (message) {
        errors[field] = message
      } else {
        delete errors[field]
      }
    }
    ```

    Note: the overall module shape — `$state` kept private in a `.svelte.ts` file, exposed through a returned object with `get`/`set` accessors — is **correct** per _$state → Passing state across modules_ ("don't directly export it") and _Passing state into functions_ (get/set properties keep reactivity live).

- **[STYLE] src/lib/ui/button.svelte:5-10** — `HTMLButtonAttributes & HTMLAnchorAttributes` intersects two incompatible element contracts (e.g. `type` narrows to the button union while anchor `type` is a MIME string; `href`/`download` become "valid" on buttons), losing the type safety the docs recommend wrapper components provide.
  - evidence: Svelte docs _$props → Type safety_: "Interfaces for native DOM elements are provided in the `svelte/elements` module (see Typing wrapper components)" — the interfaces are per-element; a polymorphic wrapper should discriminate on `href` rather than merge them.
  - fix:

    ```ts
    type BaseProps = {
      variant?:
        | 'default'
        | 'destructive'
        | 'outline'
        | 'secondary'
        | 'ghost'
        | 'link'
      size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
      disabled?: boolean
      children?: Snippet
    }

    type Props = BaseProps &
      (
        | (Omit<HTMLAnchorAttributes, 'href'> & { href: string })
        | (HTMLButtonAttributes & { href?: undefined })
      )
    ```

- **[SIMPLIFICATION] src/lib/ui/field.svelte:8-26** — the field requires callers to hand-wire `for`/`id` pairs and never associates `field-description`/`field-error` with the input (`aria-describedby` missing); `$props.id()` exists precisely to generate these linked IDs inside the component.
  - evidence: Svelte docs _$props → $props.id()_: "generates an ID that is unique to the current component instance … useful for linking elements via attributes like `for` and `aria-labelledby`" (available since 5.20; already used correctly in dialog/tooltip/toast-host).
  - fix: generate the id internally and hand it to the input snippet:

    ```svelte
    <script lang="ts">
      import type { Snippet } from 'svelte'

      type Props = {
        label?: string
        description?: string
        error?: string | null
        children: Snippet<[{ id: string; describedBy: string | undefined }]>
      }

      let { label, description, error = null, children }: Props = $props()

      const uid = $props.id()
      const describedBy = $derived(
        [description && `${uid}-description`, error && `${uid}-error`]
          .filter(Boolean)
          .join(' ') || undefined
      )
    </script>

    <form-field data-invalid={error ? '' : undefined}>
      {#if label}<label for={uid}>{label}</label>{/if}
      {@render children({ id: uid, describedBy })}
      {#if description}<field-description id="{uid}-description"
          >{description}</field-description
        >{/if}
      {#if error}<field-error id="{uid}-error" role="alert">{error}</field-error
        >{/if}
    </form-field>
    ```

    (Zero consumers exist yet, so the snippet-parameter API change is free now and costly later.)

## Verified correct (no change needed)

- **theme-toggle.svelte** — `matchMedia` is read only inside the click handler (a non-reactive context) and rendering is done in CSS; the _svelte/reactivity → MediaQuery_ docs explicitly say "If you can use the media query in CSS to achieve the same effect, do that." `MediaQuery` would only be warranted if JS needed to _react_ to the preference.
- **`@html` hygiene** — every dynamic `{@html}` sink (`markdown.svelte:69`, `markdown-alert.svelte:75`, `+page.svelte:30`) is DOMPurify-sanitized upstream in `src/lib/utils/markdown.ts:117-126`; `markdown-alert.svelte:71` injects only static vendored SVG constants. The autofixer's XSS flag on `markdown.svelte` is satisfied by the sanitizer.
- **`$props.id()`** — used correctly in `dialog.svelte:27`, `tooltip.svelte:14`, `toast-host.svelte:8`.
- **`+error.svelte`** — uses `page` from `$app/state` (the current API), not the deprecated `$app/stores`.
- **`svelte:boundary`** — no component uses `await` expressions; the async boot lives in the universal `+layout.ts` load, whose failures route to `+error.svelte`. No boundary opportunity exists yet.
- **`+layout.svelte:20-22`** — one-shot `onMount(initAnalytics)` matches documented `onMount` usage.
- **Autofixer** — clean on portal/markdown/markdown-timer/empty-state apart from advisory notes already covered above.

## VERDICT

The foundation is largely idiomatic Svelte 5 — runes are used where they should be, deriveds are preferred over effects, `@html` is consistently sanitized, and the state-module and bindable-prop patterns match current docs. The rot is concentrated where the code steps _outside_ the template into imperative APIs, and there it reads like Svelte-4-era memory: two components (`portal.svelte`, `empty-state.svelte`) depend on the undocumented compiled shape of snippets, and the two timer/hydration components re-implement `$effect` teardown by hand with `onMount`/`onDestroy`/microtask scaffolding. Highest-leverage changes: (1) replace the snippet-`mount()` portal with the `{@attach}` relocation pattern — it deletes the `getAllContexts` plumbing and removes the app's single riskiest internals dependency, used by every overlay; (2) collapse `markdown.svelte`'s three-path hydration into one `$effect` with teardown — it fixes the initial double-mount of every markdown island; (3) bake `$props.id()` + `aria-describedby` into `field.svelte` before form pages start consuming it, since that API change is free only while consumer count is zero.
