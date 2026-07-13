---
title: "Categories"
description: "Challenge category configuration, colors, icons, and customization."
order: 2
---

<style>
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

Category names, icons, colors, aliases, and display order are configured in `apps/web/src/lib/utils/categories.ts{:file}`.

## Default categories

:::table{cols="auto auto auto auto"}

| Category | Display name | Color | Icon component |
| --- | --- | --- | --- |
| `koth` | King of the Hill | <color-swatch style="--c:#ab4aba">plum</color-swatch> | `IconCrown{:ts}` |
| `ad` | Attack-Defense | <color-swatch style="--c:#e93d82">crimson</color-swatch> | `IconBoxingGlove{:ts}` |
| `sanity` | Sanity | <color-swatch style="--c:#8d8d8d">gray</color-swatch> | `IconSmiley{:ts}` |
| `pwn` | Binary Exploitation | <color-swatch style="--c:#e5484d">red</color-swatch> | `IconBomb{:ts}` |
| `reverse` | Reverse Engineering | <color-swatch style="--c:#f76b15">orange</color-swatch> | `IconPuzzlePiece{:ts}` |
| `crypto` | Cryptography | <color-swatch style="--c:#ffe629">yellow</color-swatch> | `IconKey{:ts}` |
| `forensics` | Forensics | <color-swatch style="--c:#30a46c">green</color-swatch> | `IconFingerprint{:ts}` |
| `blockchain` | Blockchain | <color-swatch style="--c:#12a594">teal</color-swatch> | `IconPiggyBank{:ts}` |
| `web` | Web | <color-swatch style="--c:#7ce2fe">sky</color-swatch> | `IconCloud{:ts}` |
| `misc` | Miscellaneous | <color-swatch style="--c:#6e56cf">violet</color-swatch> | `IconDiceFive{:ts}` |
| `ppc` | Professional Programming and Coding | <color-swatch style="--c:#ab4aba">plum</color-swatch> | `IconGraph{:ts}` |
| `osint` | OSINT | <color-swatch style="--c:#8d8d8d">gray</color-swatch> | `IconEye{:ts}` |

:::

The challenge list follows the order shown above. The scoreboard uses the same order with `sanity` moved to the end.

The aliases `binary` => `pwn`, `rev` => `reverse`, and `cryptography` => `crypto` are also accepted.

:::note[How category styling works]

Each hue has a `[data-category-color]{:css}` selector in `color.css{:file}`. The selector maps that hue to the generic category tokens:

```css title="styles/color.css" showLineNumbers=false
[data-category-color='red'] {
  --category-background-l0:       var(--background-red-l0);
  --category-background-l1:       var(--background-red-l1);
  --category-background-l1-hover: var(--background-red-l1-hover);
  --category-foreground-l0:       var(--foreground-red-l0);
  --category-foreground-l1:       var(--foreground-red-l1);
}
```

Set `data-category-color` on a container, then use the generic tokens in its descendants:

```svelte showLineNumbers=false
<challenge-card data-category-color={config.color}>
  <h3>{challenge.name}</h3>
  <span class="tag">{config.name}</span>
</challenge-card>

<style>
  h3 {
    color: var(--category-foreground-l0);
  }
  .tag {
    background: var(--category-background-l0);
    color: var(--category-foreground-l1);
  }
</style>
```

The tokens include two backgrounds, one hover background, and two foregrounds.

:::

## Adding a custom category

:::steps
1. **Define the category**

   Add an entry to `categoryConfigs{:ts}` with a name, icon component, and color key:

    ```ts title="lib/utils/categories.ts" ins={5-8}
    import { IconCpu } from '$lib/icons'

    export const categoryConfigs: Record<string, CategoryConfig> = {
      // ... existing
      hardware: {
        name: 'Hardware',
        icon: IconCpu,
        color: 'teal', // Use an existing color, or add a new one
      },
    }
      ```

2. **Register the icon**

   Add the Svelte icon component to `lib/icons/{:dir}`. For example, create `lib/icons/icon-cpu.svelte{:file}` and export it from `lib/icons/index.ts{:file}`.

    ```ts title="lib/icons/index.ts" ins={2}
    export { default as IconCopy } from './icon-copy.svelte'
    export { default as IconCpu } from './icon-cpu.svelte'
    export { default as IconCrown } from './icon-crown.svelte'
      ```

3. **Set the display order (optional)**

   Add your category to `categoryOrder{:ts}` to control its position in the challenge list:

    ```ts title="lib/utils/categories.ts" ins={13}
    export const categoryOrder = [
      'koth',
      'ad',
      'sanity',
      'pwn',
      'reverse',
      'crypto',
      'forensics',
      'blockchain',
      'web',
      'misc',
      'ppc',
      'osint',
      'hardware',
    ]
      ```

   Categories not in this list show up alphabetically after the listed ones. Add the same key to `scoreboardCategoryOrder{:ts}` if it should have a fixed scoreboard column.

4. **Add a hue (if using a new color)**

   Skip this step when reusing an existing hue. For a new one, add it to `CategoryColor{:ts}` in `categories.ts{:file}` and define its five variables in `apps/web/src/styles/color.css{:file}`. Then add a `[data-category-color='<hue>']{:css}` selector that maps the generic `--category-*{:css}` tokens to the new values.

:::

## Utility functions

:::table{cols="auto wrap"}

| Function | Purpose |
| --- | --- |
| `getCategoryConfig(category){:ts}` | Returns `{ name, icon, color }{:ts}` for a category key. Unknown keys fall back to a flag icon, `gray{:ts}`, and the key itself as the display name |
| `getCategoryKeyOrAlias(category){:ts}` | Lowercases the key and resolves aliases to canonical keys (`'rev'{:ts}` => `'reverse'{:ts}`) |
| `getCategoryOrder(category){:ts}` | Returns the sort index in `categoryOrder{:ts}` (`-1{:ts}` if unlisted) |
| `getScoreboardCategoryOrder(category){:ts}` | Returns the sort index in `scoreboardCategoryOrder{:ts}` (`-1{:ts}` if unlisted) |

:::
