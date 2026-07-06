---
title: "Components"
description: "Overview of the rCTF UI component library: Zag.js primitives with native scoped CSS."
order: 3
---

The rCTF UI layer is built on [Zag.js](https://zagjs.com/) headless state machines wrapped in Svelte 5 components and styled with native scoped `<style>{:html}` blocks. There is no Tailwind, no shadcn-svelte, and no `tailwind-variants` — variants are plain [data attributes](/theming/colors/) and styling hooks are custom-element tags. Reusable primitives live in `apps/web-new/src/lib/ui/{:dir}`. Feature components that compose them (Navigation, Markdown, ThemeToggle) live in `apps/web-new/src/lib/components/{:dir}`. Icons are vendored as local Svelte components in `apps/web-new/src/lib/icons/{:dir}` (Tabler Icons artwork).

Components fall into three tiers by how much machinery they need.

:::table{cols="auto wrap"}

| Tier | Components |
| --- | --- |
| **Native HTML/CSS** | `Button`, `Input`, `Textarea`, `Checkbox`, `Card`, `Section`, `Chip`, `Spinner`, `Progress`, `EmptyState`, `Field` |
| **Zag.js machines** | `Dialog`, `Menu`, `Combobox`, `Tabs`, `Accordion`, `Tooltip`, `Avatar`, `Splitter`, `Toast` |
| **Custom Svelte** | `TagInput`, `Markdown`, `Portal` |

:::

Native components are a semantic element (or a custom-element tag) plus a scoped `<style>{:html}` block and no JavaScript. Zag components wrap a `@zag-js/*{:ts}` machine once and style its emitted parts. Custom components are ported or hand-written logic that no headless machine covers.

## Adding components

Adding a component means creating one Svelte file, choosing a tier, and expressing every variant and state as a data attribute. This section walks through the shape common to all of them.

:::steps
1. **Create the component file**

   Add a `kebab-case.svelte{:file}` file under `apps/web-new/src/lib/ui/{:dir}`. Give it a single `type Props = {...}{:ts}`, destructured with defaults. Boolean attributes are forwarded as `attr={value || undefined}{:svelte}` so they only appear when truthy.

2. **Pick a tier**

   If HTML and CSS cover it, use a semantic element or a custom-element tag and a scoped `<style>{:html}` block — no JavaScript. If it has interactive state (open/closed, selection, focus management), drive it with a `@zag-js/*{:ts}` machine wrapped once in the component.

3. **Express variants as data attributes**

   Never branch styling on classes. Emit `data-variant`, `data-size`, `data-state`, and target them in the scoped style (`&[data-variant='destructive']{:css}`). Zag parts already carry `data-part` and `data-state`, so style those directly.

4. **Consume tokens directly**

   Reference the [theming tokens](/theming/colors/) straight from CSS: `var(--background-l1){:css}`, `var(--foreground-accent){:css}`, `var(--radius-md){:css}`. There is no token-mapping layer to convert.

5. **Wire Zag correctly (machines only)**

   The reactive props passed to `useMachine{:ts}` **must** be a thunk, or controlled state silently freezes:

```svelte showLineNumbers=false
const service = useMachine(dialog.machine, () => ({ id, open }))
const api = $derived(dialog.connect(service, normalizeProps))
```

   IDs come from `$props.id(){:ts}` (never `Math.random()`), and every `@zag-js/*{:ts}` package is pinned to the same 1.x version.

6. **Validate**

   Run the Svelte MCP autofixer on the component, then `$ <red>bun</red> run <dim>--filter</dim> <green>'@rctf/web-new'</green> check` must be clean before committing.

:::

## Full example

`card.svelte{:file}` is a native component: custom-element tags for structure, a scoped `<style>{:html}` block that reads layout and color tokens, and no JavaScript beyond the props.

```svelte title="lib/ui/card.svelte" showLineNumbers
<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    title?: string
    description?: string
    children: Snippet
  }

  let { title, description, children }: Props = $props()
</script>

<ui-card>
  {#if title || description}
    <card-header>
      {#if title}
        <card-title>{title}</card-title>
      {/if}
      {#if description}
        <card-description>{description}</card-description>
      {/if}
    </card-header>
  {/if}
  {@render children()}
</ui-card>

<style>
  ui-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--space-m);
    background: var(--background-l1);
    border-radius: var(--radius-lg);
  }

  card-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  card-title {
    display: block;
    font-size: var(--step-1);
  }

  card-description {
    display: block;
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }
</style>
```

For a variant-driven native component, see `button.svelte{:file}`: it renders either a `<button>{:html}` or an `<a>{:html}` depending on whether `href` is set, carries `data-variant` and `data-size`, and its scoped style targets those attributes (`&[data-variant='default']{:css}` maps to `var(--background-accent){:css}`, `&[data-size='sm']{:css}` shrinks the height, and so on) rather than composing utility classes.
</content>
