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

rCTF builds its palette from [Radix Colors](https://www.radix-ui.com/colors). The values and theme tokens are defined in `apps/web/src/styles/color.css{:file}`.

Each token defines its light and dark values with `light-dark(){:css}`. Set `data-theme="light"{:html}` or `data-theme="dark"{:html}` on `<html>{:html}` to choose one. Without that attribute, `prefers-color-scheme{:css}` follows the operating system setting.

The theme toggle saves the choice to `localStorage{:js}`. On later visits, `static/theme.js{:file}` applies it before the page paints so the other theme does not flash during loading.

## Color reference

### Layered colors

Most of the interface uses Radix's neutral `gray{:css}` scale, arranged into six background and foreground layers named `l0` through `l5`. Backgrounds move from the page-level `gray-1{:css}` toward `gray-7{:css}`, becoming more prominent as the layer number rises. Foregrounds move the other way, starting with `gray-12{:css}` for primary text and fading toward `gray-8{:css}`.

:::table{cols="auto auto auto auto auto"}

| Layer | Background (light) | Background (dark) | Foreground (light) | Foreground (dark) |
| --- | --- | --- | --- | --- |
| `l0` | <color-swatch style="--c:#fcfcfc">gray-1</color-swatch> | <color-swatch style="--c:#111111">gray-1</color-swatch> | <color-swatch style="--c:#202020">gray-12</color-swatch> | <color-swatch style="--c:#eeeeee">gray-12</color-swatch> |
| `l1` | <color-swatch style="--c:#f0f0f0">gray-3</color-swatch> | <color-swatch style="--c:#191919">gray-2</color-swatch> | <color-swatch style="--c:#646464">gray-11</color-swatch> | <color-swatch style="--c:#b4b4b4">gray-11</color-swatch> |
| `l2` | <color-swatch style="--c:#e8e8e8">gray-4</color-swatch> | <color-swatch style="--c:#222222">gray-3</color-swatch> | <color-swatch style="--c:#838383">gray-10</color-swatch> | <color-swatch style="--c:#7b7b7b">gray-10</color-swatch> |
| `l3` | <color-swatch style="--c:#e0e0e0">gray-5</color-swatch> | <color-swatch style="--c:#2a2a2a">gray-4</color-swatch> | <color-swatch style="--c:#8d8d8d">gray-9</color-swatch> | <color-swatch style="--c:#6e6e6e">gray-9</color-swatch> |
| `l4` | <color-swatch style="--c:#d9d9d9">gray-6</color-swatch> | <color-swatch style="--c:#313131">gray-5</color-swatch> | <color-swatch style="--c:#bbbbbb">gray-8</color-swatch> | <color-swatch style="--c:#606060">gray-8</color-swatch> |
| `l5` | <color-swatch style="--c:#cecece">gray-7</color-swatch> | <color-swatch style="--c:#3a3a3a">gray-6</color-swatch> | <color-swatch style="--c:#bbbbbb">gray-8</color-swatch> | <color-swatch style="--c:#484848">gray-7</color-swatch> |

:::

Component CSS can use these tokens wherever it needs a layered color, for example `background: var(--background-l1){:css}` or `color: var(--foreground-l2){:css}`.

### Semantic colors

Semantic colors convey meaning. Each role pairs a soft background wash with a readable foreground, and the interactive roles add a `-hover{:css}` background variant.

:::table{cols="auto auto auto wrap"}

| Role | Light | Dark | Tokens | Usage |
| --- | --- | --- | --- | --- |
| `accent` | <color-swatch style="--c:#d1f0fa">sky-4</color-swatch> | <color-swatch style="--c:#113555">sky-4</color-swatch> | `--background-accent`, `--background-accent-hover`, `--foreground-accent` | Primary actions, buttons, links |
| `destructive` | <color-swatch style="--c:#ffdbdc">red-4</color-swatch> | <color-swatch style="--c:#500f1c">red-4</color-swatch> | `--background-destructive`, `--background-destructive-hover`, `--foreground-destructive` | Error states, delete actions |
| `success` | <color-swatch style="--c:#e6f7ed">jade-3</color-swatch> | <color-swatch style="--c:#0f2e22">jade-3</color-swatch> | `--background-success`, `--foreground-success` | Success states, solved challenges |

:::

### Scoreboard colors

These colors appear on scoreboards, podiums, and blood medals. `gold`, `silver`, and `bronze` mark the top three places, `self` highlights the current user's row, and `nth` uses the neutral layers for everyone else.

:::table{cols="auto auto auto auto auto"}

| Color | Background (light) | Background (dark) | Foreground (light) | Foreground (dark) |
| --- | --- | --- | --- | --- |
| `gold` | <color-swatch style="--c:#ffde003d;--bg:#fcfcfc">amber-a3</color-swatch> | <color-swatch style="--c:#ffc53d26;--bg:#111111">amber-9 15%</color-swatch> | <color-swatch style="--c:#ab6400">amber-11</color-swatch> | <color-swatch style="--c:#ffca16">amber-11</color-swatch> |
| `silver` | <color-swatch style="--c:#0000330f;--bg:#fcfcfc">slate-a3</color-swatch> | <color-swatch style="--c:#696e774d;--bg:#111111">slate-9 30%</color-swatch> | <color-swatch style="--c:#60646c">slate-11</color-swatch> | <color-swatch style="--c:#b0b4ba">slate-11</color-swatch> |
| `bronze` | <color-swatch style="--c:#9f4d0035;--bg:#fcfcfc">brown-a5</color-swatch> | <color-swatch style="--c:#ad7f5840;--bg:#111111">brown-9 25%</color-swatch> | <color-swatch style="--c:#815e46">brown-11</color-swatch> | <color-swatch style="--c:#dbb594">brown-11</color-swatch> |
| `self` | <color-swatch style="--c:#e6f7ed">jade-3</color-swatch> | <color-swatch style="--c:#0f2e22">jade-3</color-swatch> | <color-swatch style="--c:#208368">jade-11</color-swatch> | <color-swatch style="--c:#1fd8a4">jade-11</color-swatch> |
| `nth` | <color-swatch style="--c:#d9d9d9">background-l4</color-swatch> | <color-swatch style="--c:#2a2a2a">background-l3</color-swatch> | <color-swatch style="--c:#202020">foreground-l0</color-swatch> | <color-swatch style="--c:#6e6e6e">foreground-l3</color-swatch> |

:::

Use the `-l0{:css}` foregrounds for primary text and `-l1{:css}` for secondary text.

### Graph colors

Graph colors are only used for lines on graphs and sparklines. The tokens run from `--foreground-first{:css}` to `--foreground-tenth{:css}`. Each one is step 9 of a different Radix hue and stays the same in both modes.

:::table{cols="auto auto auto"}

| Color | Light | Dark |
| --- | --- | --- |
| `first` | <color-swatch style="--c:#e5484d">red-9</color-swatch> | <color-swatch style="--c:#e5484d">red-9</color-swatch> |
| `second` | <color-swatch style="--c:#ffc53d">amber-9</color-swatch> | <color-swatch style="--c:#ffc53d">amber-9</color-swatch> |
| `third` | <color-swatch style="--c:#bdee63">lime-9</color-swatch> | <color-swatch style="--c:#bdee63">lime-9</color-swatch> |
| `fourth` | <color-swatch style="--c:#29a383">jade-9</color-swatch> | <color-swatch style="--c:#29a383">jade-9</color-swatch> |
| `fifth` | <color-swatch style="--c:#00a2c7">cyan-9</color-swatch> | <color-swatch style="--c:#00a2c7">cyan-9</color-swatch> |
| `sixth` | <color-swatch style="--c:#7ce2fe">sky-9</color-swatch> | <color-swatch style="--c:#7ce2fe">sky-9</color-swatch> |
| `seventh` | <color-swatch style="--c:#0090ff">blue-9</color-swatch> | <color-swatch style="--c:#0090ff">blue-9</color-swatch> |
| `eighth` | <color-swatch style="--c:#6e56cf">violet-9</color-swatch> | <color-swatch style="--c:#6e56cf">violet-9</color-swatch> |
| `ninth` | <color-swatch style="--c:#ab4aba">plum-9</color-swatch> | <color-swatch style="--c:#ab4aba">plum-9</color-swatch> |
| `tenth` | <color-swatch style="--c:#d6409f">pink-9</color-swatch> | <color-swatch style="--c:#d6409f">pink-9</color-swatch> |

:::

### Prose colors

Prose colors style rendered Markdown, such as challenge descriptions and homepage content.

:::table{cols="auto auto auto"}

| Color | Light | Dark |
| --- | --- | --- |
| `prose` | <color-swatch style="--c:#646464">gray-11</color-swatch> | <color-swatch style="--c:#b4b4b4">gray-11</color-swatch> |
| `prose-link` | <color-swatch style="--c:#00749e">sky-11</color-swatch> | <color-swatch style="--c:#75c7f0">sky-11</color-swatch> |
| `prose-inline-code` | <color-swatch style="--c:#646464">gray-11</color-swatch> | <color-swatch style="--c:#ff9592">red-11</color-swatch> |

:::

### Category colors

Challenge categories pick from ten hues. Each hue has two background tints plus a hover variant and two foreground levels. All of them come from Radix's alpha scales, so they blend into whatever layer they sit on.

:::table{cols="auto auto auto auto auto"}

| Color | <span class="text-nowrap">`--background-<hue>-l0{:css}`</span> | <span class="text-nowrap">`--background-<hue>-l1{:css}`</span> | <span class="text-nowrap">`--foreground-<hue>-l0{:css}`</span> | <span class="text-nowrap">`--foreground-<hue>-l1{:css}`</span> |
| --- | --- | --- | --- | --- |
| `crimson` | <color-swatch style="--c:#ff005216;--bg:#fcfcfc">crimson-a3</color-swatch> | <color-swatch style="--c:#e0004008;--bg:#fcfcfc">crimson-a2</color-swatch> | <color-swatch style="--c:#530026e9;--bg:#fcfcfc">crimson-a12</color-swatch> | <color-swatch style="--c:#c4004fe2;--bg:#fcfcfc">crimson-a11</color-swatch> |
| `red` | <color-swatch style="--c:#f3000d14;--bg:#fcfcfc">red-a3</color-swatch> | <color-swatch style="--c:#ff000008;--bg:#fcfcfc">red-a2</color-swatch> | <color-swatch style="--c:#55000de8;--bg:#fcfcfc">red-a12</color-swatch> | <color-swatch style="--c:#c40006d3;--bg:#fcfcfc">red-a11</color-swatch> |
| `orange` | <color-swatch style="--c:#ff9c0029;--bg:#fcfcfc">orange-a3</color-swatch> | <color-swatch style="--c:#ff8e0012;--bg:#fcfcfc">orange-a2</color-swatch> | <color-swatch style="--c:#431200e2;--bg:#fcfcfc">orange-a12</color-swatch> | <color-swatch style="--c:#cc4e00;--bg:#fcfcfc">orange-a11</color-swatch> |
| `yellow` | <color-swatch style="--c:#ffee0047;--bg:#fcfcfc">yellow-a3</color-swatch> | <color-swatch style="--c:#f4dd0016;--bg:#fcfcfc">yellow-a2</color-swatch> | <color-swatch style="--c:#2e2000e0;--bg:#fcfcfc">yellow-a12</color-swatch> | <color-swatch style="--c:#9e6c00;--bg:#fcfcfc">yellow-a11</color-swatch> |
| `green` | <color-swatch style="--c:#00a43319;--bg:#fcfcfc">green-a3</color-swatch> | <color-swatch style="--c:#00a32f0b;--bg:#fcfcfc">green-a2</color-swatch> | <color-swatch style="--c:#002616e6;--bg:#fcfcfc">green-a12</color-swatch> | <color-swatch style="--c:#00713fde;--bg:#fcfcfc">green-a11</color-swatch> |
| `teal` | <color-swatch style="--c:#00c69d1f;--bg:#fcfcfc">teal-a3</color-swatch> | <color-swatch style="--c:#00aa800c;--bg:#fcfcfc">teal-a2</color-swatch> | <color-swatch style="--c:#00332df2;--bg:#fcfcfc">teal-a12</color-swatch> | <color-swatch style="--c:#008573;--bg:#fcfcfc">teal-a11</color-swatch> |
| `sky` | <color-swatch style="--c:#00b3ee1e;--bg:#fcfcfc">sky-a3</color-swatch> | <color-swatch style="--c:#00a4db0e;--bg:#fcfcfc">sky-a2</color-swatch> | <color-swatch style="--c:#002540e2;--bg:#fcfcfc">sky-a12</color-swatch> | <color-swatch style="--c:#00749e;--bg:#fcfcfc">sky-a11</color-swatch> |
| `violet` | <color-swatch style="--c:#4400ee0f;--bg:#fcfcfc">violet-a3</color-swatch> | <color-swatch style="--c:#4900ff07;--bg:#fcfcfc">violet-a2</color-swatch> | <color-swatch style="--c:#0b0043d9;--bg:#fcfcfc">violet-a12</color-swatch> | <color-swatch style="--c:#1f0099af;--bg:#fcfcfc">violet-a11</color-swatch> |
| `plum` | <color-swatch style="--c:#cc00cc14;--bg:#fcfcfc">plum-a3</color-swatch> | <color-swatch style="--c:#c000c008;--bg:#fcfcfc">plum-a2</color-swatch> | <color-swatch style="--c:#40004be6;--bg:#fcfcfc">plum-a12</color-swatch> | <color-swatch style="--c:#730086c1;--bg:#fcfcfc">plum-a11</color-swatch> |
| `gray` | <color-swatch style="--c:#0000000f;--bg:#fcfcfc">gray-a3</color-swatch> | <color-swatch style="--c:#00000006;--bg:#fcfcfc">gray-a2</color-swatch> | <color-swatch style="--c:#000000df;--bg:#fcfcfc">gray-a12</color-swatch> | <color-swatch style="--c:#0000009b;--bg:#fcfcfc">gray-a11</color-swatch> |

:::

A `[data-category-color='<hue>']{:css}` block in `color.css{:file}` points the generic `--category-*{:css}` tokens at one of these ramps. See [Categories](/theming/categories/) for how a component picks its hue.
</content>
</invoke>
