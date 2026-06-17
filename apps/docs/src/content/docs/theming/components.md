---
title: "Components"
description: "Overview of the rCTF UI component library based on shadcn-svelte."
order: 3
---

<style>
  /* A color swatch is a single styled custom element (no JS): the sample color
     rides on the inline --c custom property, the optional backing on --bg (used
     so translucent samples read against a fixed light/dark page), and the label
     is the element's own text content. */
  color-swatch {
    display: inline-flex;
    align-items: center;
    gap: 0.45em;
    width: fit-content;
    max-width: 100%;
    padding: 0.2em 0.5em;
    border: 1px solid var(--border);
    border-radius: 0.4em;
    background-color: color-mix(in oklab, var(--muted) 35%, transparent);
    font-family: var(--font-mono);
    font-size: 0.8125em;
    line-height: 1.25;
    vertical-align: middle;
    white-space: nowrap;
  }
  color-swatch::before {
    content: "";
    flex-shrink: 0;
    inline-size: 1.1em;
    block-size: 1.1em;
    border-radius: 0.3em;
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--border) 75%, transparent);
    background-image:
      linear-gradient(var(--c, transparent), var(--c, transparent)),
      linear-gradient(var(--bg, transparent), var(--bg, transparent)),
      repeating-conic-gradient(
        color-mix(in oklab, var(--muted-foreground) 18%, transparent) 0 25%,
        transparent 0 50%
      );
    background-size: auto, auto, 0.5em 0.5em;
  }
  color-swatch:empty {
    padding: 0.25em;
  }
</style>
The rCTF UI layer is built on [shadcn-svelte](https://shadcn-svelte.com/), a port of shadcn/ui for Svelte 5. Components live in `apps/web/src/lib/components/ui/{:dir}` and use [tailwind-variants](https://www.tailwind-variants.org/) for variant-based styling. Application-specific components (Navigation, Markdown, ThemeToggle) are in the parent `components/{:dir}` directory. Icons are vendored as local Svelte components in `apps/web/src/lib/icons/{:dir}` (Tabler Icons artwork).

The following components are available in rCTF:

:::table{cols="auto wrap"}

| Category | Components |
| --- | --- |
| **Primitives** | `Button`, `Badge`, `Input`, `Textarea`, `Checkbox`, `Label`, `Separator`, `Progress`, `Spinner`, `Skeleton` |
| **Layout** | `Card`, `Section`, `ScrollArea`, `Resizable`, `Sidebar` |
| **Overlays** | `Dialog`, `Drawer`, `Sheet`, `Tooltip`, `Popover`, `DropdownMenu` |
| **Data** | `Table`, `Accordion`, `Tabs`, `VirtualList`\*, `Chart` |
| **Forms** | `Field`, `InputGroup`, `Select`, `TagInput`\*, `SchemaForm`\* |
| **Navigation** | `Command`, `Pagination`, `ButtonGroup` |
| **App** | `Navigation`\*, `NavigationMobile`\*, `ThemeToggle`\*, `Markdown`\*, `FlagPicker`\*, `EmptyState`\*, `SearchInput`\* |

:::

\* These components are custom to rCTF and are not part of shadcn-svelte.

## Adding components

When adding a new shadcn-svelte component to rCTF, you need to install it, register it in the barrel file, and convert its styling to match rCTF's design system. This section walks through the full process using `Button` as an example.

:::steps
1. **Install the component**

   Use the shadcn-svelte CLI to scaffold the component into your project:

```console
$ <red>bunx</red> shadcn-svelte@latest add button
   ```

   This creates the component files in `apps/web/src/lib/components/ui/button/{:dir}`.

2. **Register in the barrel file**

   Add the component to the barrel export in `apps/web/src/lib/components/index.ts{:file}`:

```ts title="lib/components/index.ts" ins={3-9}
export { Badge, badgeVariants, type BadgeVariant } from './ui/badge'
export { default as EmptyState } from './empty-state.svelte'
export {
  Button,
  buttonVariants,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from './ui/button'
export { Checkbox } from './ui/checkbox'
export { Input } from './ui/input'
export { Label } from './ui/label'
   ```

3. **Remove shadows**

   rCTF uses a flat design language. Remove all shadow utilities from the component:

```ts title="button.svelte" del={2,6,8,10,12} ins={3,7,9,11,13}
export const buttonVariants = tv({
  base: '... shadow-xs',
  base: '...',
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs',
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive hover:bg-destructive/90 ... shadow-xs',
      destructive: 'bg-destructive hover:bg-destructive/90 ...',
      outline: 'bg-background hover:bg-accent ... shadow-xs',
      outline: 'bg-background hover:bg-accent ...',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-xs',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    },
  },
})
   ```

4. **Normalize font weights**

   Convert all heavy font weights to `font-medium{:css}` for visual consistency (`font-semibold{:css}`, `font-bold{:css}`, `font-extrabold{:css}`, `font-black{:css}`).

5. **Convert color tokens**

   Replace shadcn's color tokens with rCTF's [layered color system](/docs/theming/colors/). The mapping depends on context, so use these as guidelines rather than strict rules:

   | rCTF token | Example | Light | Dark | Context |
   | --- | --- | --- | --- | --- |
   | `--background{:css}` | `bg-background-l0{:css}` | <color-swatch style="--c:oklch(98% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(15% 0 0)"></color-swatch> | Page background |
   | `--foreground{:css}` | `text-foreground-l0{:css}` | <color-swatch style="--c:oklch(37.1% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(98.5% 0 0)"></color-swatch> | Primary body text |
   | `--card{:css}` | `bg-background-l1{:css}` | <color-swatch style="--c:oklch(95% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(18.5% 0 0)"></color-swatch> | Card surfaces |
   | `--card-foreground{:css}` | `text-foreground-l0{:css}` | <color-swatch style="--c:oklch(37.1% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(98.5% 0 0)"></color-swatch> | Card text |
   | `--popover{:css}` | `bg-background-l1{:css}` | <color-swatch style="--c:oklch(95% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(18.5% 0 0)"></color-swatch> | Dropdowns, popovers |
   | `--popover-foreground{:css}` | `text-foreground-l0{:css}` | <color-swatch style="--c:oklch(37.1% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(98.5% 0 0)"></color-swatch> | Text in overlays |
   | `--primary{:css}` | `bg-background-accent{:css}` | <color-swatch style="--c:color-mix(in oklch, oklch(90.1% 0.058 230.902) 50%, transparent);--bg:oklch(98% 0 0)"></color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(44.3% 0.11 240.79) 30%, transparent);--bg:oklch(15% 0 0)"></color-swatch> | Accent buttons, badges |
   | `--primary-foreground{:css}` | `text-foreground-accent{:css}` | <color-swatch style="--c:oklch(50% 0.134 242.749)"></color-swatch> | <color-swatch style="--c:oklch(82.8% 0.111 230.318)"></color-swatch> | Text on accent backgrounds/accent-colored text |
   | `--secondary{:css}` | `bg-background-l4{:css}` | <color-swatch style="--c:oklch(89% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(30% 0 0)"></color-swatch> | Secondary buttons, badges |
   | `--secondary-foreground{:css}` | `text-foreground-l1{:css}` | <color-swatch style="--c:oklch(43.9% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(92.2% 0 0)"></color-swatch> | Text on secondary backgrounds |
   | `--muted{:css}` | `bg-background-l2{:css}` | <color-swatch style="--c:oklch(93% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(22% 0 0)"></color-swatch> | Subtle backgrounds |
   | `--muted-foreground{:css}` | `text-foreground-l3{:css}` | <color-swatch style="--c:oklch(60% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(70.8% 0 0)"></color-swatch> | Placeholders, hints |
   | `--accent{:css}` | `bg-background-l2{:css}` | <color-swatch style="--c:oklch(93% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(22% 0 0)"></color-swatch> | Hover states, highlights, generic hover |
   | `--accent-foreground{:css}` | `text-foreground-l0{:css}` | <color-swatch style="--c:oklch(37.1% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(98.5% 0 0)"></color-swatch> | Text on hover backgrounds |
   | `--destructive{:css}` | `bg-background-destructive{:css}` | <color-swatch style="--c:color-mix(in oklch, oklch(70.4% 0.191 22.216) 30%, transparent);--bg:oklch(98% 0 0)"></color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(25.8% 0.092 26.042) 50%, transparent);--bg:oklch(15% 0 0)"></color-swatch> | Error states |
   | `--input{:css}` | `bg-background-l4{:css}` | <color-swatch style="--c:oklch(89% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(30% 0 0)"></color-swatch> | Form inputs |
   | `hover:bg-background-accent-hover` | hover | <color-swatch style="--c:color-mix(in oklch, oklch(90.1% 0.058 230.902) 70%, transparent);--bg:oklch(98% 0 0)"></color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(44.3% 0.11 240.79) 50%, transparent);--bg:oklch(15% 0 0)"></color-swatch> | Accent hover states |
   | `hover:bg-background-l5` | hover | <color-swatch style="--c:oklch(84% 0 0)"></color-swatch> | <color-swatch style="--c:oklch(40% 0 0)"></color-swatch> | Secondary hover states |

   Here's an example converting the `Badge` component variants:

```ts title="badge.svelte" del={3,6,9,12} ins={4,7,10,13}
variants: {
  variant: {
    default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90 border-transparent",
    default: "bg-background-accent text-foreground-accent [a&]:hover:bg-background-accent/90 border-transparent",

    secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 border-transparent",
    secondary: "bg-background-l4 text-foreground-l1 [a&]:hover:bg-background-l5 border-transparent",

    destructive: "bg-destructive [a&]:hover:bg-destructive/90 ... dark:bg-destructive/70 border-transparent text-white",
    destructive: "bg-background-destructive text-foreground-destructive [a&]:hover:bg-background-destructive/90 ... border-transparent",

    outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
    outline: "text-foreground-l1 [a&]:hover:bg-background-l2",
  },
},
   ```

6. **Remove dark mode overrides (optional)**

   rCTF's color system handles dark mode automatically via CSS custom properties. Remove all `dark:` prefixed utilities.

7. **Remove transitions (optional)**

   rCTF components generally don't use transitions to avoid grogginess/exhaustion when repeatedly using the same interfaces. Remove if desired.

:::

## Full example

Here's the complete before and after for the Button component:

::::tabs
:::tab[Before (shadcn-svelte)]
```svelte showLineNumbers mark={7,10-15}
<script lang="ts" module>
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
  import { type VariantProps, tv } from "tailwind-variants";

export const buttonVariants = tv({
  base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&\_svg:not([class*='size-'])]:size-4",
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs',
      destructive:
        'bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white shadow-xs',
      outline:
        'bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border shadow-xs',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-xs',
      ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-9 px-4 py-2 has-[>svg]:px-3',
      sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
      lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
      icon: 'size-9',
      'icon-sm': 'size-8',
      'icon-lg': 'size-10',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

// ...

</script>
```
:::
:::tab[After (rCTF)]
```svelte showLineNumbers mark={7,10-15}
<script lang="ts" module>
  import { cn, type WithElementRef } from '$lib/utils'
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements'
  import { tv, type VariantProps } from 'tailwind-variants'

export const buttonVariants = tv({
  base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-foreground-destructive/20 aria-invalid:border-foreground-destructive inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&\_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  variants: {
    variant: {
      default: 'bg-background-accent text-foreground-accent hover:bg-background-accent-hover',
      destructive:
        'bg-background-destructive text-foreground-destructive hover:bg-background-destructive-hover focus-visible:ring-foreground-destructive/20 border-foreground-destructive/50',
      outline: 'bg-background-l1 hover:bg-background-l2 text-foreground-l1 border',
      secondary: 'bg-background-l4 text-foreground-l1 hover:bg-background-l5',
      ghost: 'hover:bg-background-l3 text-foreground-l1',
      link: 'text-foreground-prose-link underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-9 px-4 py-2 has-[>svg]:px-3',
      sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
      lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
      icon: 'size-9',
      'icon-sm': 'size-8',
      'icon-lg': 'size-10',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})
// ...

</script>
```
:::
::::
