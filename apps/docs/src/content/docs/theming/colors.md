---
title: "Color system"
description: "Understanding and customizing the rCTF color system, including light/dark themes and semantic colors."
order: 1
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

All colors in rCTF are defined using [OKLCH](https://oklch.com). Colors are declared as CSS custom properties in `apps/web/src/app.css{:file}`, with `:root{:css}` containing light mode values and `[data-theme='dark']{:css}` providing dark mode overrides. The theme is toggled via the `data-theme` attribute on `<html>{:html}`, persisted to `localStorage`, and respects `prefers-color-scheme` on first load.

## Color reference

### Layered colors

The foundation of rCTF's color system is an altered version of [shadcn/ui](https://ui.shadcn.com/docs/theming/)'s system. We add nested lightness layers 0 through 5, where layer `l0` represents the base (page background or primary text). Higher numbers progressively add emphasis (for backgrounds) or reduce prominence (for foregrounds).

:::table{cols="auto auto auto auto auto"}

| Layer | Background (light) | Background (dark) | Foreground (light) | Foreground (dark) |
| --- | --- | --- | --- | --- |
| `l0` | <color-swatch style="--c:oklch(98% 0 0)">oklch(98% 0 0)</color-swatch> | <color-swatch style="--c:oklch(15% 0 0)">oklch(15% 0 0)</color-swatch> | <color-swatch style="--c:oklch(37.1% 0 0)">neutral-700</color-swatch> | <color-swatch style="--c:oklch(98.5% 0 0)">neutral-50</color-swatch> |
| `l1` | <color-swatch style="--c:oklch(95% 0 0)">oklch(95% 0 0)</color-swatch> | <color-swatch style="--c:oklch(18.5% 0 0)">oklch(18.5% 0 0)</color-swatch> | <color-swatch style="--c:oklch(43.9% 0 0)">neutral-600</color-swatch> | <color-swatch style="--c:oklch(92.2% 0 0)">neutral-200</color-swatch> |
| `l2` | <color-swatch style="--c:oklch(93% 0 0)">oklch(93% 0 0)</color-swatch> | <color-swatch style="--c:oklch(22% 0 0)">oklch(22% 0 0)</color-swatch> | <color-swatch style="--c:oklch(55.6% 0 0)">neutral-500</color-swatch> | <color-swatch style="--c:oklch(87% 0 0)">neutral-300</color-swatch> |
| `l3` | <color-swatch style="--c:oklch(91% 0 0)">oklch(91% 0 0)</color-swatch> | <color-swatch style="--c:oklch(26% 0 0)">oklch(26% 0 0)</color-swatch> | <color-swatch style="--c:oklch(60% 0 0)">oklch(60% 0 0)</color-swatch> | <color-swatch style="--c:oklch(70.8% 0 0)">neutral-400</color-swatch> |
| `l4` | <color-swatch style="--c:oklch(89% 0 0)">oklch(89% 0 0)</color-swatch> | <color-swatch style="--c:oklch(30% 0 0)">oklch(30% 0 0)</color-swatch> | <color-swatch style="--c:oklch(65% 0 0)">oklch(65% 0 0)</color-swatch> | <color-swatch style="--c:oklch(59.7% 0 0)">oklch(59.7% 0 0)</color-swatch> |
| `l5` | <color-swatch style="--c:oklch(84% 0 0)">oklch(84% 0 0)</color-swatch> | <color-swatch style="--c:oklch(40% 0 0)">oklch(40% 0 0)</color-swatch> | <color-swatch style="--c:oklch(70% 0 0)">oklch(70% 0 0)</color-swatch> | <color-swatch style="--c:oklch(55.6% 0 0)">neutral-500</color-swatch> |

:::

These variables are mapped to Tailwind utilities via `@theme inline{:css}` in `app.css{:file}`, enabling classes like `bg-background-l1{:css}` and `text-foreground-l2{:css}` that we use throughout the application.

### Semantic colors

Semantic colors are used to convey meaning.

:::table{cols="auto auto auto wrap"}

| Color | Light | Dark | Usage |
| --- | --- | --- | --- |
| `accent` | <color-swatch style="--c:color-mix(in oklch, oklch(90.1% 0.058 230.902) 50%, transparent);--bg:oklch(98% 0 0)">sky-200 @ 50%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(44.3% 0.11 240.79) 30%, transparent);--bg:oklch(15% 0 0)">sky-800 @ 30%</color-swatch> | Primary actions, buttons, links |
| `destructive` | <color-swatch style="--c:color-mix(in oklch, oklch(70.4% 0.191 22.216) 30%, transparent);--bg:oklch(98% 0 0)">red-400 @ 30%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(25.8% 0.092 26.042) 50%, transparent);--bg:oklch(15% 0 0)">red-950 @ 50%</color-swatch> | Error states, delete actions |
| `success` | <color-swatch style="--c:color-mix(in oklch, oklch(76.8% 0.233 130.85) 10%, transparent);--bg:oklch(98% 0 0)">emerald-500 @ 10%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(40.5% 0.101 131.063) 10%, transparent);--bg:oklch(15% 0 0)">emerald-900 @ 10%</color-swatch> | Success states, solved challenges |

:::

### Scoreboard colors

Leaderboard colors are reserved for visualizing rankings on scoreboards and podiums, as well as for highlighting first, second, and third bloods. Gold, silver, and bronze semantically denote the top three placements (see [Wikipedia's "Hierarchy of precious substances"](https://en.wikipedia.org/wiki/Hierarchy_of_precious_substances)), while "self" highlights the current user's row. The "nth" color is applied to all other participants outside the top three, and is just mappings of our layered color system.

:::table{cols="auto auto auto auto auto"}

| Color | Background (light) | Background (dark) | Foreground (light) | Foreground (dark) |
| --- | --- | --- | --- | --- |
| `gold` | <color-swatch style="--c:color-mix(in oklch, oklch(79.5% 0.184 86.047) 15%, transparent);--bg:oklch(98% 0 0)">yellow-500 @ 15%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(28.6% 0.066 53.813) 20%, transparent);--bg:oklch(15% 0 0)">yellow-950 @ 20%</color-swatch> | <color-swatch style="--c:oklch(68.1% 0.162 75.834)">yellow-600</color-swatch> | <color-swatch style="--c:oklch(85.2% 0.199 91.936)">yellow-400</color-swatch> |
| `silver` | <color-swatch style="--c:color-mix(in oklch, oklch(70.4% 0.04 256.788) 20%, transparent);--bg:oklch(98% 0 0)">slate-400 @ 20%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(37.2% 0.044 257.287) 20%, transparent);--bg:oklch(15% 0 0)">slate-700 @ 20%</color-swatch> | <color-swatch style="--c:oklch(44.6% 0.043 257.281)">slate-600</color-swatch> | <color-swatch style="--c:oklch(86.9% 0.022 252.894)">slate-300</color-swatch> |
| `bronze` | <color-swatch style="--c:color-mix(in oklch, oklch(47.3% 0.137 46.201) 10%, transparent);--bg:oklch(98% 0 0)">amber-800 @ 10%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(27.9% 0.077 45.635) 20%, transparent);--bg:oklch(15% 0 0)">amber-950 @ 20%</color-swatch> | <color-swatch style="--c:oklch(47.3% 0.137 46.201)">amber-800</color-swatch> | <color-swatch style="--c:oklch(76.9% 0.188 70.08)">amber-500</color-swatch> |
| `self` | <color-swatch style="--c:oklch(93% 0.02 160)">oklch(93% 0.02 160)</color-swatch> | <color-swatch style="--c:oklch(22% 0.015 163)">oklch(22% 0.015 163)</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(50.8% 0.118 165.612) 80%, transparent);--bg:oklch(98% 0 0)">emerald-700 @ 80%</color-swatch> | <color-swatch style="--c:oklch(76.5% 0.177 163.223)">emerald-400</color-swatch> |
| `nth` | <color-swatch style="--c:oklch(89% 0 0)">background-l4</color-swatch> | <color-swatch style="--c:oklch(26% 0 0)">background-l3</color-swatch> | <color-swatch style="--c:oklch(43.9% 0 0)">foreground-l1</color-swatch> | <color-swatch style="--c:oklch(87% 0 0)">foreground-l2</color-swatch> |

:::

### Graph colors

Graph colors are exclusively used to color lines on graphs and sparklines.

:::table{cols="auto auto auto"}

| Color | Light | Dark |
| --- | --- | --- |
| `first` | <color-swatch style="--c:oklch(63.7% 0.237 25.331)">red-500</color-swatch> | <color-swatch style="--c:oklch(80.8% 0.114 19.571)">red-300</color-swatch> |
| `second` | <color-swatch style="--c:oklch(76.9% 0.188 70.08)">amber-500</color-swatch> | <color-swatch style="--c:oklch(87.9% 0.169 91.605)">amber-300</color-swatch> |
| `third` | <color-swatch style="--c:oklch(76.8% 0.233 130.85)">lime-500</color-swatch> | <color-swatch style="--c:oklch(89.7% 0.196 126.665)">lime-300</color-swatch> |
| `fourth` | <color-swatch style="--c:oklch(69.6% 0.17 162.48)">emerald-500</color-swatch> | <color-swatch style="--c:oklch(84.5% 0.143 164.978)">emerald-300</color-swatch> |
| `fifth` | <color-swatch style="--c:oklch(71.5% 0.143 215.221)">cyan-500</color-swatch> | <color-swatch style="--c:oklch(86.5% 0.127 207.078)">cyan-300</color-swatch> |
| `sixth` | <color-swatch style="--c:oklch(68.5% 0.169 237.323)">sky-500</color-swatch> | <color-swatch style="--c:oklch(82.8% 0.111 230.318)">sky-300</color-swatch> |
| `seventh` | <color-swatch style="--c:oklch(62.3% 0.214 259.815)">blue-500</color-swatch> | <color-swatch style="--c:oklch(80.9% 0.105 251.813)">blue-300</color-swatch> |
| `eighth` | <color-swatch style="--c:oklch(60.6% 0.25 292.717)">violet-500</color-swatch> | <color-swatch style="--c:oklch(81.1% 0.111 293.571)">violet-300</color-swatch> |
| `ninth` | <color-swatch style="--c:oklch(66.7% 0.295 322.15)">fuchsia-500</color-swatch> | <color-swatch style="--c:oklch(83.3% 0.145 321.434)">fuchsia-300</color-swatch> |
| `tenth` | <color-swatch style="--c:oklch(65.6% 0.241 354.308)">pink-500</color-swatch> | <color-swatch style="--c:oklch(82.3% 0.12 346.018)">pink-300</color-swatch> |

:::

### Prose colors

Prose colors are used for text in prose content, such as descriptions of challenges and homepage content.

:::table{cols="auto auto auto"}

| Color | Light | Dark |
| --- | --- | --- |
| `prose` | <color-swatch style="--c:oklch(43.9% 0 0)">foreground-l1</color-swatch> | <color-swatch style="--c:oklch(87% 0 0)">foreground-l2</color-swatch> |
| `prose-link` | <color-swatch style="--c:oklch(50% 0.134 242.749)">sky-700</color-swatch> | <color-swatch style="--c:oklch(82.8% 0.111 230.318)">sky-300</color-swatch> |
| `prose-inline-code` | <color-swatch style="--c:oklch(43.9% 0 0)">foreground-l1</color-swatch> | <color-swatch style="--c:oklch(93.6% 0.032 17.717)">red-100</color-swatch> |

:::

### Category colors

Each challenge category is assigned an arbitrary color set from the following sets:

:::table{cols="auto auto auto auto auto"}

| Color | <span class="text-nowrap">`background-${color}-l0{:css}`</span> | <span class="text-nowrap">`background-${color}-l1{:css}`</span> | <span class="text-nowrap">`foreground-${color}-l0{:css}`</span> | <span class="text-nowrap">`foreground-${color}-l1{:css}`</span> |
| --- | --- | --- | --- | --- |
| `red` | <color-swatch style="--c:color-mix(in oklch, oklch(70.4% 0.191 22.216) 15%, transparent);--bg:oklch(98% 0 0)">red-400 @ 15%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(70.4% 0.191 22.216) 5%, transparent);--bg:oklch(98% 0 0)">red-400 @ 5%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(39.6% 0.141 25.723) 90%, transparent);--bg:oklch(98% 0 0)">red-900 @ 90%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(39.6% 0.141 25.723) 80%, transparent);--bg:oklch(98% 0 0)">red-900 @ 80%</color-swatch> |
| `orange` | <color-swatch style="--c:color-mix(in oklch, oklch(75% 0.183 55.934) 15%, transparent);--bg:oklch(98% 0 0)">orange-400 @ 15%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(75% 0.183 55.934) 5%, transparent);--bg:oklch(98% 0 0)">orange-400 @ 5%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(40.8% 0.123 38.172) 90%, transparent);--bg:oklch(98% 0 0)">orange-900 @ 90%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(40.8% 0.123 38.172) 80%, transparent);--bg:oklch(98% 0 0)">orange-900 @ 80%</color-swatch> |
| `yellow` | <color-swatch style="--c:color-mix(in oklch, oklch(85.2% 0.199 91.936) 15%, transparent);--bg:oklch(98% 0 0)">yellow-400 @ 15%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(85.2% 0.199 91.936) 5%, transparent);--bg:oklch(98% 0 0)">yellow-400 @ 5%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(42.1% 0.095 57.708) 90%, transparent);--bg:oklch(98% 0 0)">yellow-900 @ 90%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(42.1% 0.095 57.708) 80%, transparent);--bg:oklch(98% 0 0)">yellow-900 @ 80%</color-swatch> |
| `green` | <color-swatch style="--c:color-mix(in oklch, oklch(79.2% 0.209 151.711) 15%, transparent);--bg:oklch(98% 0 0)">green-400 @ 15%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(79.2% 0.209 151.711) 5%, transparent);--bg:oklch(98% 0 0)">green-400 @ 5%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(39.3% 0.095 152.535) 90%, transparent);--bg:oklch(98% 0 0)">green-900 @ 90%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(39.3% 0.095 152.535) 80%, transparent);--bg:oklch(98% 0 0)">green-900 @ 80%</color-swatch> |
| `teal` | <color-swatch style="--c:color-mix(in oklch, oklch(77.7% 0.152 181.912) 15%, transparent);--bg:oklch(98% 0 0)">teal-400 @ 15%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(77.7% 0.152 181.912) 5%, transparent);--bg:oklch(98% 0 0)">teal-400 @ 5%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(38.6% 0.063 188.416) 90%, transparent);--bg:oklch(98% 0 0)">teal-900 @ 90%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(38.6% 0.063 188.416) 80%, transparent);--bg:oklch(98% 0 0)">teal-900 @ 80%</color-swatch> |
| `blue` | <color-swatch style="--c:color-mix(in oklch, oklch(74.6% 0.16 232.661) 15%, transparent);--bg:oklch(98% 0 0)">sky-400 @ 15%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(74.6% 0.16 232.661) 5%, transparent);--bg:oklch(98% 0 0)">sky-400 @ 5%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(39.1% 0.09 240.876) 90%, transparent);--bg:oklch(98% 0 0)">sky-900 @ 90%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(39.1% 0.09 240.876) 80%, transparent);--bg:oklch(98% 0 0)">sky-900 @ 80%</color-swatch> |
| `purple` | <color-swatch style="--c:color-mix(in oklch, oklch(71.4% 0.203 305.504) 15%, transparent);--bg:oklch(98% 0 0)">purple-400 @ 15%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(71.4% 0.203 305.504) 5%, transparent);--bg:oklch(98% 0 0)">purple-400 @ 5%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(38.1% 0.176 304.987) 90%, transparent);--bg:oklch(98% 0 0)">purple-900 @ 90%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(38.1% 0.176 304.987) 80%, transparent);--bg:oklch(98% 0 0)">purple-900 @ 80%</color-swatch> |
| `fuchsia` | <color-swatch style="--c:color-mix(in oklch, oklch(74% 0.238 322.16) 15%, transparent);--bg:oklch(98% 0 0)">fuchsia-400 @ 15%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(74% 0.238 322.16) 5%, transparent);--bg:oklch(98% 0 0)">fuchsia-400 @ 5%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(40.1% 0.17 325.612) 90%, transparent);--bg:oklch(98% 0 0)">fuchsia-900 @ 90%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(40.1% 0.17 325.612) 80%, transparent);--bg:oklch(98% 0 0)">fuchsia-900 @ 80%</color-swatch> |
| `pink` | <color-swatch style="--c:color-mix(in oklch, oklch(71.8% 0.202 349.761) 15%, transparent);--bg:oklch(98% 0 0)">pink-400 @ 15%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(71.8% 0.202 349.761) 5%, transparent);--bg:oklch(98% 0 0)">pink-400 @ 5%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(40.8% 0.153 2.432) 90%, transparent);--bg:oklch(98% 0 0)">pink-900 @ 90%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(40.8% 0.153 2.432) 80%, transparent);--bg:oklch(98% 0 0)">pink-900 @ 80%</color-swatch> |
| `gray` | <color-swatch style="--c:color-mix(in oklch, oklch(70.7% 0.022 261.325) 15%, transparent);--bg:oklch(98% 0 0)">gray-400 @ 15%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(70.7% 0.022 261.325) 5%, transparent);--bg:oklch(98% 0 0)">gray-400 @ 5%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(21% 0.034 264.665) 90%, transparent);--bg:oklch(98% 0 0)">gray-900 @ 90%</color-swatch> | <color-swatch style="--c:color-mix(in oklch, oklch(21% 0.034 264.665) 80%, transparent);--bg:oklch(98% 0 0)">gray-900 @ 80%</color-swatch> |

:::
