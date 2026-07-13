---
title: "Components"
description: "How rCTF builds UI components from Zag.js machines and scoped CSS."
order: 3
---

rCTF's interface is built from Svelte 5 components with scoped `<style>{:html}` blocks. Interactive widgets such as dialogs and menus use [Zag.js](https://zagjs.com/) state machines for their behavior, while the surrounding markup and styles remain in the Svelte components.

The interface is split across these directories.

| Path | Contents |
| --- | --- |
| `apps/web/src/lib/ui/{:dir}` | Reusable controls and layout primitives |
| `apps/web/src/lib/components/{:dir}` | Features such as the navigation bar and Markdown renderer |
| `apps/web/src/lib/icons/{:dir}` | Local Svelte icon components, mostly sourced from [Phosphor Icons](https://phosphoricons.com/) |

Variants are represented with [data attributes](/theming/colors/), while layout components use custom tags such as `<ui-card>{:html}`.

Components are grouped by how they handle behavior.

:::table{cols="auto wrap"}

| Tier | Components |
| --- | --- |
| **Native HTML/CSS** | `Button`, `Input`, `Textarea`, `Checkbox`, `Card`, `Section`, `Chip`, `Spinner`, `EmptyState`, `Field`, `StatusCard` |
| **Zag.js machines** | `Dialog`, `Menu`, `Combobox`, `Tabs`, `Accordion`, `Tooltip`, `Avatar`, `Splitter`, `Progress`, `TreeView`, `Toast` |
| **Custom Svelte** | `TagInput`, `Portal` |

:::

## Adding components

When adding a component, choose the simplest tier that fits its behavior and keep its variants and state in data attributes. Most components only need a single Svelte file.

:::steps
1. **Create the component file**

   Add a `kebab-case.svelte{:file}` file under `apps/web/src/lib/ui/{:dir}`. Give it a single `type Props = {...}{:ts}`, destructured with defaults. Boolean attributes are forwarded as `attr={value || undefined}{:svelte}` so they only appear when truthy.

2. **Pick a tier**

   If HTML and CSS cover it, use a semantic element or a custom-element tag and a scoped `<style>{:html}` block (do not use JavaScript). If it has interactive state (open/closed, selection, focus management), drive it with a `@zag-js/*{:ts}` machine wrapped once in the component.

3. **Express variants as data attributes**

   Never branch styling on classes. Emit `data-variant`, `data-size`, `data-state`, and target them in the scoped style (`&[data-variant='destructive']{:css}`). Zag parts already carry `data-part` and `data-state`, so style those directly.

4. **Use theme tokens**

   Reference [theme tokens](/theming/colors/) from the component CSS, using values such as `var(--background-l1){:css}`, `var(--foreground-accent){:css}`, and `var(--radius-md){:css}`.

5. **Wire Zag correctly (machines only)**

   The reactive props passed to `useMachine{:ts}` **must** be a thunk, or controlled state silently freezes:

   ```ts showLineNumbers=false
   const service = useMachine(dialog.machine, () => ({ id, open }))
   const api = $derived(dialog.connect(service, normalizeProps))
   ```

   IDs come from `$props.id(){:ts}` (never `Math.random()`), and every `@zag-js/*{:ts}` package is pinned to the same 1.x version.

6. **Validate**

   Run the Svelte MCP autofixer on the component, then `$ <red>bun</red> run <dim>--filter</dim> <green>'@rctf/web'</green> check` must be clean before committing.

:::

## Full example

`card.svelte{:file}` shows the usual structure for a native component.

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
    padding: var(--space-s-m);
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

For a native component with variants, see `button.svelte{:file}`. Depending on whether `href` is set, it renders either a `<button>{:html}` or an `<a>{:html}` and styles it through the `data-variant` and `data-size` attributes. The default variant uses `var(--background-accent){:css}`, for example, while the small size reduces the component's height.
</content>
