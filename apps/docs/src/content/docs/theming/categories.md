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
  cat-icon {
    display: inline-block;
    vertical-align: middle;
    line-height: 0;
    color: var(--muted-foreground);
  }
  cat-icon svg {
    width: 1.5em;
    height: 1.5em;
  }
</style>

Each challenge category in rCTF has an icon, a display name, and a color, configured in `apps/web-new/src/lib/utils/categories.ts{:file}`. A category's `color{:ts}` is one of ten hue keys from the `CategoryColor{:ts}` union (e.g. `red`). Colors are applied declaratively: a container element carries `data-category-color={config.color}{:svelte}`, and matching `[data-category-color='<hue>']{:css}` blocks in `apps/web-new/src/styles/color.css{:file}` remap the generic `--category-*{:css}` tokens onto that hue's ramp. Because custom properties inherit, descendants read the generic tokens (`var(--category-foreground-l0){:css}`, `var(--category-background-l0){:css}`, …) without knowing which hue is active.

## Default categories

Each of the default categories uses a color specified in [Category colors](/theming/colors/#category-colors).

:::table{cols="auto auto auto auto"}

| Category | Display name | Color | Icon |
| --- | --- | --- | --- |
| `sanity` | Sanity | <color-swatch style="--c:#8d8d8d">gray</color-swatch> | <cat-icon><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M17 3.34a10 10 0 1 1-14.995 8.984L2 12l.005-.324A10 10 0 0 1 17 3.34M15 13H9a1 1 0 0 0-1 1v.05a3.975 3.975 0 0 0 3.777 3.97l.227.005a4.026 4.026 0 0 0 3.99-3.79l.006-.206A1 1 0 0 0 15 13M9.01 8l-.127.007A1 1 0 0 0 9 10l.127-.007A1 1 0 0 0 9.01 8m6 0l-.127.007A1 1 0 0 0 15 10l.127-.007A1 1 0 0 0 15.01 8" /></svg></cat-icon> |
| `pwn` | Binary Exploitation | <color-swatch style="--c:#e5484d">red</color-swatch> | <cat-icon><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="currentColor"> <path d="M14.499 3.996a2.2 2.2 0 0 1 1.556.645l3.302 3.301a2.2 2.2 0 0 1 0 3.113l-.567.567l.043.192a8.5 8.5 0 0 1-3.732 8.83l-.23.144a8.5 8.5 0 1 1-2.687-15.623l.192.042l.567-.566a2.2 2.2 0 0 1 1.362-.636zM10 9a4 4 0 0 0-4 4a1 1 0 0 0 2 0a2 2 0 0 1 2-2a1 1 0 0 0 0-2" /> <path d="M21 2a1 1 0 0 1 .117 1.993L21 4h-1c0 .83-.302 1.629-.846 2.25L19 6.413l-1.293 1.293a1 1 0 0 1-1.497-1.32l.083-.094L17.586 5c.232-.232.375-.537.407-.86L18 4a2 2 0 0 1 1.85-1.995L20 2z" /> </g></svg></cat-icon> |
| `reverse` | Reverse Engineering | <color-swatch style="--c:#f76b15">orange</color-swatch> | <cat-icon><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M10 2a3 3 0 0 1 2.995 2.824L13 5v1h3a2 2 0 0 1 1.995 1.85L18 8v3h1a3 3 0 0 1 .176 5.995L19 17h-1v3a2 2 0 0 1-1.85 1.995L16 22h-3a2 2 0 0 1-1.995-1.85L11 20v-1a1 1 0 0 0-1.993-.117L9 19v1a2 2 0 0 1-1.85 1.995L7 22H4a2 2 0 0 1-1.995-1.85L2 20v-3a2 2 0 0 1 1.85-1.995L4 15h1a1 1 0 0 0 .117-1.993L5 13H4a2 2 0 0 1-1.995-1.85L2 11V8a2 2 0 0 1 1.85-1.995L4 6h3V5a3 3 0 0 1 3-3" /></svg></cat-icon> |
| `crypto` | Cryptography | <color-swatch style="--c:#ffe629">yellow</color-swatch> | <cat-icon><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M14.52 2c1.029 0 2.015.409 2.742 1.136l3.602 3.602a3.877 3.877 0 0 1 0 5.483l-2.643 2.643a3.88 3.88 0 0 1-4.941.452l-.105-.078l-5.882 5.883a3 3 0 0 1-1.68.843l-.22.027l-.221.009H4c-1.014 0-1.867-.759-1.991-1.823L2 20v-1.172c0-.704.248-1.386.73-1.96l.149-.161l.414-.414A1 1 0 0 1 4 16h1v-1a1 1 0 0 1 .883-.993L6 14h1v-1a1 1 0 0 1 .206-.608l.087-.1l1.468-1.469l-.076-.103a3.9 3.9 0 0 1-.678-1.963L8 8.521c0-1.029.409-2.015 1.136-2.742l2.643-2.643A3.88 3.88 0 0 1 14.52 2m.495 5h-.02a2 2 0 1 0 0 4h.02a2 2 0 1 0 0-4" /></svg></cat-icon> |
| `forensics` | Forensics | <color-swatch style="--c:#30a46c">green</color-swatch> | <cat-icon><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m15.707 4.293l3 3a1 1 0 0 1 0 1.414l-1.553 1.555a7 7 0 0 1-.256 9.74L19 20a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2h1v-1a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2v1h4a5 5 0 0 0 3.737-8.323l-3.03 3.03a1 1 0 0 1-1.414 0l-.793-.792l-.793.792a1 1 0 1 1-1.414-1.414l.792-.793l-.792-.793a1 1 0 0 1 0-1.414l6-6a1 1 0 0 1 1.414 0m2-2l3 3a1 1 0 1 1-1.414 1.414l-3-3a1 1 0 1 1 1.414-1.414" /></svg></cat-icon> |
| `blockchain` | Blockchain | <color-swatch style="--c:#12a594">teal</color-swatch> | <cat-icon><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M17 3.34A10 10 0 1 1 2 12l.005-.324A10 10 0 0 1 17 3.34M12 6a1 1 0 0 0-1 1a3 3 0 1 0 0 6v2a1.02 1.02 0 0 1-.866-.398l-.068-.101a1 1 0 0 0-1.732.998a3 3 0 0 0 2.505 1.5H11a1 1 0 0 0 .883.994L12 18a1 1 0 0 0 1-1l.176-.005A3 3 0 0 0 13 11V9c.358-.012.671.14.866.398l.068.101a1 1 0 0 0 1.732-.998A3 3 0 0 0 13.161 7H13a1 1 0 0 0-1-1m1 7a1 1 0 0 1 0 2zm-2-4v2a1 1 0 0 1 0-2" /></svg></cat-icon> |
| `web` | Web | <color-swatch style="--c:#7ce2fe">blue</color-swatch> | <cat-icon><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M9 20a2 2 0 0 1-2 2H3a1 1 0 0 1 0-2h4v-2.997l-.343.001a1 1 0 0 1-.117-.007l-.105-.001c-2.94-.11-5.317-2.399-5.43-5.263L1 11.517C1 8.77 3.08 6.507 5.784 6.1l.114-.016l.07-.181c.663-1.62 2.056-2.906 3.829-3.518l.244-.08c2.194-.667 4.614-.224 6.36 1.176c1.385 1.108 2.187 2.686 2.25 4.34l.004.212l.091.003c2.3.107 4.143 1.961 4.25 4.27l.004.211c0 2.478-1.997 4.487-4.465 4.487H17V20h4a1 1 0 0 1 0 2h-4a2 2 0 0 1-2-2v-2.997h-2V21a1 1 0 0 1-2 0v-3.997H9z" /></svg></cat-icon> |
| `misc` | Miscellaneous | <color-swatch style="--c:#8e4ec6">purple</color-swatch> | <cat-icon><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M18.333 2c1.96 0 3.56 1.537 3.662 3.472l.005.195v12.666c0 1.96-1.537 3.56-3.472 3.662l-.195.005H5.667a3.667 3.667 0 0 1-3.662-3.472L2 18.333V5.667c0-1.96 1.537-3.56 3.472-3.662L5.667 2zM15.5 15a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3m-7 0a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3m0-4.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3m7 0a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3M8.5 6a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3m7 0a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3" /></svg></cat-icon> |
| `ppc` | Professional Programming and Coding | <color-swatch style="--c:#ab4aba">fuchsia</color-swatch> | <cat-icon><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M14 1a3 3 0 0 1 2.348 4.868l2 3.203Q18.665 9 19 9a3 3 0 1 1-2.347 1.132l-2-3.203a3 3 0 0 1-1.304 0l-2.001 3.203c.408.513.652 1.162.652 1.868s-.244 1.356-.653 1.868l2.002 3.203Q13.664 17 14 17a3 3 0 1 1-2.347 1.132L9.65 14.929a3 3 0 0 1-1.302 0l-2.002 3.203a3 3 0 1 1-1.696-1.06l2.002-3.204A3 3 0 0 1 9.65 9.07l2.002-3.202A3 3 0 0 1 14 1" /></svg></cat-icon> |
| `koth` | King of the Hill | <color-swatch style="--c:#d6409f">pink</color-swatch> | <cat-icon><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a2 2 0 0 1 1.572 3.236l.793 1.983l1.702-1.702A2.003 2.003 0 0 1 18 3a2 2 0 0 1 .674 3.884l-1.69 9.295a1 1 0 0 1-.865.814L16 17H8a1 1 0 0 1-.956-.705l-.028-.116l-1.69-9.295a2 2 0 1 1 2.607-1.367l1.701 1.702l.794-1.983A2 2 0 0 1 12 2m6 16H6a1 1 0 0 0-1 1a2 2 0 0 0 2 2h10a2 2 0 0 0 1.987-1.768l.011-.174A1 1 0 0 0 18 18" /></svg></cat-icon> |
| `osint` | OSINT | <color-swatch style="--c:#8d8d8d">gray</color-swatch> | <cat-icon><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4c4.29 0 7.863 2.429 10.665 7.154l.22.379l.045.1l.03.083l.014.055l.014.082l.011.1v.11l-.014.111a1 1 0 0 1-.026.11l-.039.108l-.036.075l-.016.03c-2.764 4.836-6.3 7.38-10.555 7.499L12 20c-4.396 0-8.037-2.549-10.868-7.504a1 1 0 0 1 0-.992C3.963 6.549 7.604 4 12 4m0 5a3 3 0 1 0 0 6a3 3 0 0 0 0-6" /></svg></cat-icon> |

:::

A handful of category aliases (`binary` => `pwn`, `rev` => `reverse`, `cryptography` => `crypto`) make naming a bit more flexible.

:::note[How category styling works]

Each hue has a `[data-category-color]{:css}` block in `color.css{:file}` that binds its variables to the generic category tokens:

```css title="styles/color.css" showLineNumbers=false
[data-category-color='red'] {
  --category-background-l0:       var(--background-red-l0);
  --category-background-l1:       var(--background-red-l1);
  --category-background-l1-hover: var(--background-red-l1-hover);
  --category-foreground-l0:       var(--foreground-red-l0);
  --category-foreground-l1:       var(--foreground-red-l1);
}
```

A component sets `data-category-color` on a container, and descendants read the generic tokens from their scoped styles (custom properties inherit):

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

Each hue defines five variables in `color.css{:file}` for both light and dark modes (via `light-dark(){:css}`): `--background-<hue>-l0{:css}`, `--background-<hue>-l1{:css}`, `--background-<hue>-l1-hover{:css}`, `--foreground-<hue>-l0{:css}`, and `--foreground-<hue>-l1{:css}`. CSS cannot construct a property name from a value, so each of the ten hues gets its own explicit block — keep the `CategoryColor{:ts}` union and those blocks in sync. No JavaScript emits category CSS.

:::
## Adding a custom category

:::steps
1. **Define the category**

   Add an entry to `categoryConfigs{:ts}` with a name, icon component, and color key:

```ts title="lib/utils/categories.ts" ins={5-8}
import { IconCpuFilled } from '$lib/icons'

export const categoryConfigs: Record<string, CategoryConfig> = {
  // ... existing
  hardware: {
    name: 'Hardware',
    icon: IconCpuFilled,
    color: 'teal', // Use an existing color, or add a new one
  },
}
   ```

2. **Register the icon**

   Icons are vendored as local Svelte components under `lib/icons/{:file}`. Add the component file (e.g. `lib/icons/icon-cpu-filled.svelte{:file}`) and export it from `lib/icons/index.ts{:file}`:

```ts title="lib/icons/index.ts" ins={3}
export { default as IconAlertCircleFilled } from './icon-alert-circle-filled.svelte'
export { default as IconCameraFilled } from './icon-camera-filled.svelte'
export { default as IconCpuFilled } from './icon-cpu-filled.svelte'
export { default as IconPhotoFilled } from './icon-photo-filled.svelte'
export { default as IconAlertTriangleFilled } from './icon-alert-triangle-filled.svelte'
   ```

3. **Set the display order (optional)**

   Add your category to `categoryOrder{:ts}` to control its position in the challenge list:

```ts title="lib/utils/categories.ts" ins={13}
export const categoryOrder = [
  'koth',
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

   Categories not in this list show up alphabetically after the listed ones. A separate `scoreboardCategoryOrder{:ts}` controls column order on the scoreboard.

4. **Add a hue (if using a new color)**

   The `color{:ts}` must be a member of the `CategoryColor{:ts}` union. To introduce a hue that isn't already there, add it to the union in `categories.ts{:file}`, then define its ramp in `apps/web-new/src/styles/color.css{:file}`: `--background-<hue>-l0{:css}`, `--background-<hue>-l1{:css}`, `--background-<hue>-l1-hover{:css}`, `--foreground-<hue>-l0{:css}`, and `--foreground-<hue>-l1{:css}` (as `light-dark(){:css}` pairs). Finally add a `[data-category-color='<hue>']{:css}` block that points the generic `--category-*{:css}` tokens at those variables. Reuse an existing hue to skip this step.

:::

## Utility functions

The following utility functions help with category configuration:

:::table{cols="auto wrap"}

| Function | Purpose |
| --- | --- |
| `getCategoryConfig(category){:ts}` | Returns `{ name, icon, color }{:ts}` for a category key, falling back to a default flag icon and `gray{:ts}` for unknown keys |
| `getCategoryKeyOrAlias(category){:ts}` | Lowercases the key and resolves aliases to canonical keys (`'rev'{:ts}` => `'reverse'{:ts}`) |
| `getCategoryOrder(category){:ts}` | Returns the sort index in `categoryOrder{:ts}` (`-1{:ts}` if unlisted) |
| `getScoreboardCategoryOrder(category){:ts}` | Returns the sort index in `scoreboardCategoryOrder{:ts}` (`-1{:ts}` if unlisted) |

:::
