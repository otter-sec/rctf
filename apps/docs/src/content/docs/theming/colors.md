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

All colors in rCTF come from [Radix Colors](https://www.radix-ui.com/colors). The palette is copied into `apps/web-new/src/styles/color.css{:file}`, so there is no runtime dependency on Radix itself.

Every token is declared once with `light-dark(){:css}`, which carries both the light value and the dark value. The browser picks a side based on `color-scheme{:css}`. Setting `data-theme{:html}` to `light` or `dark` on `<html>{:html}` pins the page to one mode. When the attribute is absent, the page follows the operating system through `prefers-color-scheme{:css}`.

The theme toggle saves your choice to `localStorage{:js}`. A small blocking script, `static/theme.js{:file}`, restores it onto `<html>{:html}` before the page first paints, so a reload never flashes the wrong theme.

## Color reference

### Layered colors

Most of the UI is drawn with Radix's neutral `gray{:css}` scale. Backgrounds and foregrounds each come in six layers, `l0` through `l5`. Background layers climb the gray steps from `gray-1{:css}` (the page base) up to `gray-7{:css}`, so a higher number stands out more. Foreground layers walk down from `gray-12{:css}` (primary text) to `gray-8{:css}`, so a higher number fades further back.

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

Component styles read these tokens directly, as in `background: var(--background-l1){:css}` or `color: var(--foreground-l2){:css}`. There is no utility-class layer in between.

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

These colors appear on scoreboards, podiums, and blood medals. `gold`, `silver`, and `bronze` mark the top three placements (see [Wikipedia's "Hierarchy of precious substances"](https://en.wikipedia.org/wiki/Hierarchy_of_precious_substances)). `self` highlights the current user's row, and `nth` covers everyone outside the top three by reusing the layered grays.

:::table{cols="auto auto auto auto auto"}

| Color | Background (light) | Background (dark) | Foreground (light) | Foreground (dark) |
| --- | --- | --- | --- | --- |
| `gold` | <color-swatch style="--c:#ffde003d;--bg:#fcfcfc">amber-a3</color-swatch> | <color-swatch style="--c:#ffc53d26;--bg:#111111">amber-9 15%</color-swatch> | <color-swatch style="--c:#ab6400">amber-11</color-swatch> | <color-swatch style="--c:#ffca16">amber-11</color-swatch> |
| `silver` | <color-swatch style="--c:#0000330f;--bg:#fcfcfc">slate-a3</color-swatch> | <color-swatch style="--c:#696e774d;--bg:#111111">slate-9 30%</color-swatch> | <color-swatch style="--c:#60646c">slate-11</color-swatch> | <color-swatch style="--c:#b0b4ba">slate-11</color-swatch> |
| `bronze` | <color-swatch style="--c:#9f4d0035;--bg:#fcfcfc">brown-a5</color-swatch> | <color-swatch style="--c:#ad7f5840;--bg:#111111">brown-9 25%</color-swatch> | <color-swatch style="--c:#815e46">brown-11</color-swatch> | <color-swatch style="--c:#dbb594">brown-11</color-swatch> |
| `self` | <color-swatch style="--c:#e6f7ed">jade-3</color-swatch> | <color-swatch style="--c:#0f2e22">jade-3</color-swatch> | <color-swatch style="--c:#208368">jade-11</color-swatch> | <color-swatch style="--c:#1fd8a4">jade-11</color-swatch> |
| `nth` | <color-swatch style="--c:#d9d9d9">background-l4</color-swatch> | <color-swatch style="--c:#2a2a2a">background-l3</color-swatch> | <color-swatch style="--c:#202020">foreground-l0</color-swatch> | <color-swatch style="--c:#6e6e6e">foreground-l3</color-swatch> |

:::

The token sets differ a little per color. Each medal has one background, `--background-gold{:css}` and so on, plus two foregrounds. The `-l1{:css}` foreground is the `-l0{:css}` color at 70% opacity and is used for secondary text on a medal row. `self` has two backgrounds and two foregrounds (`--background-self-l0{:css}`, `--background-self-l1{:css}`, `--foreground-self-l0{:css}`, `--foreground-self-l1{:css}`) because the current user's row needs more states. `nth` has a single `--background-nth{:css}` and two foregrounds that reuse the layered grays.

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
| `red` | <color-swatch style="--c:#f3000d14;--bg:#fcfcfc">red-a3</color-swatch> | <color-swatch style="--c:#ff000008;--bg:#fcfcfc">red-a2</color-swatch> | <color-swatch style="--c:#c40006d3;--bg:#fcfcfc">red-a11</color-swatch> | <color-swatch style="--c:#d10005c1;--bg:#fcfcfc">red-a10</color-swatch> |
| `orange` | <color-swatch style="--c:#ff9c0029;--bg:#fcfcfc">orange-a3</color-swatch> | <color-swatch style="--c:#ff8e0012;--bg:#fcfcfc">orange-a2</color-swatch> | <color-swatch style="--c:#cc4e00;--bg:#fcfcfc">orange-a11</color-swatch> | <color-swatch style="--c:#ef5f00;--bg:#fcfcfc">orange-a10</color-swatch> |
| `yellow` | <color-swatch style="--c:#ffee0047;--bg:#fcfcfc">yellow-a3</color-swatch> | <color-swatch style="--c:#f4dd0016;--bg:#fcfcfc">yellow-a2</color-swatch> | <color-swatch style="--c:#9e6c00;--bg:#fcfcfc">yellow-a11</color-swatch> | <color-swatch style="--c:#ffdc00;--bg:#fcfcfc">yellow-a10</color-swatch> |
| `green` | <color-swatch style="--c:#00a43319;--bg:#fcfcfc">green-a3</color-swatch> | <color-swatch style="--c:#00a32f0b;--bg:#fcfcfc">green-a2</color-swatch> | <color-swatch style="--c:#00713fde;--bg:#fcfcfc">green-a11</color-swatch> | <color-swatch style="--c:#008647d4;--bg:#fcfcfc">green-a10</color-swatch> |
| `teal` | <color-swatch style="--c:#00c69d1f;--bg:#fcfcfc">teal-a3</color-swatch> | <color-swatch style="--c:#00aa800c;--bg:#fcfcfc">teal-a2</color-swatch> | <color-swatch style="--c:#008573;--bg:#fcfcfc">teal-a11</color-swatch> | <color-swatch style="--c:#009684f2;--bg:#fcfcfc">teal-a10</color-swatch> |
| `blue` | <color-swatch style="--c:#00b3ee1e;--bg:#fcfcfc">sky-a3</color-swatch> | <color-swatch style="--c:#00a4db0e;--bg:#fcfcfc">sky-a2</color-swatch> | <color-swatch style="--c:#00749e;--bg:#fcfcfc">sky-a11</color-swatch> | <color-swatch style="--c:#00bcf38b;--bg:#fcfcfc">sky-a10</color-swatch> |
| `purple` | <color-swatch style="--c:#8e00f112;--bg:#fcfcfc">purple-a3</color-swatch> | <color-swatch style="--c:#8000e008;--bg:#fcfcfc">purple-a2</color-swatch> | <color-swatch style="--c:#52009aba;--bg:#fcfcfc">purple-a11</color-swatch> | <color-swatch style="--c:#53009eb8;--bg:#fcfcfc">purple-a10</color-swatch> |
| `fuchsia` | <color-swatch style="--c:#cc00cc14;--bg:#fcfcfc">plum-a3</color-swatch> | <color-swatch style="--c:#c000c008;--bg:#fcfcfc">plum-a2</color-swatch> | <color-swatch style="--c:#730086c1;--bg:#fcfcfc">plum-a11</color-swatch> | <color-swatch style="--c:#7f0092bb;--bg:#fcfcfc">plum-a10</color-swatch> |
| `pink` | <color-swatch style="--c:#f4008c16;--bg:#fcfcfc">pink-a3</color-swatch> | <color-swatch style="--c:#e0008008;--bg:#fcfcfc">pink-a2</color-swatch> | <color-swatch style="--c:#b60074d6;--bg:#fcfcfc">pink-a11</color-swatch> | <color-swatch style="--c:#c2007ac7;--bg:#fcfcfc">pink-a10</color-swatch> |
| `gray` | <color-swatch style="--c:#0000000f;--bg:#fcfcfc">gray-a3</color-swatch> | <color-swatch style="--c:#00000006;--bg:#fcfcfc">gray-a2</color-swatch> | <color-swatch style="--c:#0000009b;--bg:#fcfcfc">gray-a11</color-swatch> | <color-swatch style="--c:#0000007c;--bg:#fcfcfc">gray-a10</color-swatch> |

:::

A `[data-category-color='<hue>']{:css}` block in `color.css{:file}` points the generic `--category-*{:css}` tokens at one of these ramps. See [Categories](/theming/categories/) for how a component picks its hue.
</content>
</invoke>
