# astro-erudite Deep-Read Report (for rCTF web-new rewrite)

Repo: `/Users/enscribe/Repositories/jktrn/astro-erudite` — Astro 7, zero CSS framework, zero UI library, 11 runtime deps (all markdown-pipeline), Biome for formatting only (CSS formatter and linter both disabled; hand-formatted CSS with aligned values). TS via `astro/tsconfigs/strict`, path alias `@/* → ./src/*`. Biome: 2-space, 80-col, double quotes, `semicolons: "asNeeded"`.

## 1. CSS Architecture

### File organization & cascade order

16 small single-purpose global CSS files in `src/styles/`, imported (in order) at the top of the single `src/layouts/Layout.astro`:

```
reset.css → fonts.css → color.css → typography.css → typography-headings.css
→ typography-inline.css → typography-lists.css → typography-block.css
→ typography-tables.css → typography-math.css → callout.css → layout.css
→ icon-button.css → bar.css → shape.css
```

Each file owns one concern: `reset` (preflight), `fonts` (@font-face + font tokens), `color` (palette + semantic tokens + focus ring), `typography` (type scale + prose base), `typography-*` (prose element styling, all nested under the `prose-content` custom element), `callout` (admonitions), `layout` (space scale + grid tokens + scroll padding), `shape` (radius/blur/aspect tokens), `icon-button`/`bar` (shared "utility components" keyed off data attributes). All files use native CSS nesting heavily.

### Reset (`src/styles/reset.css`) — rules, in order

Tailwind-Preflight-derived, framework-free (full text in §4):

1. `*, ::after, ::before, ::backdrop, ::file-selector-button` → `box-sizing: border-box; margin: 0; padding: 0; border: 0 solid;`
2. `html, :host` → `line-height: 1.5; -webkit-text-size-adjust: 100%; tab-size: 4; -webkit-tap-highlight-color: transparent;`
3. `hr` → height 0, color inherit, 1px top border
4. `abbr[title]` → dotted underline
5. `h1–h6` → `font-size: inherit; font-weight: inherit` (headings are opt-in)
6. `a` → color/decoration inherit
7. `b, strong` → `font-weight: bolder`
8. `code, kbd, samp, pre` → `font-size: 1em`; `small` → 80%; `sub/sup` positioning
9. `table` → `border-collapse: collapse; border-color: inherit; text-indent: 0`
10. `:-moz-focusring` → `outline: auto`; `progress` baseline; `summary` → `display: list-item`
11. `ol, ul, menu` → `list-style: none` (lists opt back in inside prose)
12. `img, svg, video, canvas, audio, iframe, embed, object` → `display: block; vertical-align: middle`; `img, video` → `max-width: 100%; height: auto`
13. Form controls (`button, input, select, optgroup, textarea, ::file-selector-button`) → inherit `font`, `font-feature-settings`, `font-variation-settings`, `letter-spacing`, `color`; `border-radius: 0; background-color: transparent; opacity: 1`
14. `::placeholder` opacity 1 + `color-mix(in oklab, currentcolor 50%, transparent)` behind `@supports`
15. `textarea` → `resize: vertical`; assorted webkit search/datetime fixes; `appearance: button` on submit-type inputs
16. `[hidden]:where(:not([hidden="until-found"]))` → `display: none !important`
17. **Global reduced-motion kill switch**: `@media (prefers-reduced-motion: reduce)` → all animation/transition durations `0.01ms !important`, `scroll-behavior: auto !important`

### Fonts (`src/styles/fonts.css`)

- **IBM Plex Sans** variable font (`wght 100–700`, `wdth` axis), separate italic variable file; two additional Latin-Extended subset files scoped with `unicode-range: U+0100-02FF, U+0300-036F, U+1D00-1DBF, U+1E00-1EFF, U+20A0-20C0, U+2C60-2C7F, U+A720-A7FF`. All `font-display: swap`, all self-hosted woff2 in `src/assets/fonts/`.
- **IBM Plex Mono** static, weights 400 + 500 (+ italics).
- **STIX Two Math** for MathML.
- **Metric-adjusted local fallbacks** to eliminate CLS during swap (worth copying verbatim):

```css
@font-face {
  font-family: 'IBM Plex Sans Fallback';
  src: local('Arial');
  font-weight: 100 700;
  font-style: normal;
  size-adjust: 101.1663%;
  ascent-override: 101.3184%;
  descent-override: 27.183%;
  line-gap-override: 0%;
}
/* italic twin with identical metrics; mono fallback: */
@font-face {
  font-family: 'IBM Plex Mono Fallback';
  src: local('Courier New');
  font-weight: 400 500;
  size-adjust: 99.9837%;
  ascent-override: 102.5167%;
  descent-override: 27.5045%;
}
:root {
  --font-sans: 'IBM Plex Sans', 'IBM Plex Sans Fallback', sans-serif;
  --font-mono: 'IBM Plex Mono', 'IBM Plex Mono Fallback', monospace;
  --font-math: 'STIX Two Math', math;
}
```

- Head preloads only the two main sans woff2 files: `<link rel="preload" as="font" type="font/woff2" crossorigin>` (Vite `?url` imports in `MetaHead.astro`).

### Type scale & leading system (`src/styles/typography.css`)

- **Utopia fluid type scale**, 5 steps, generator URL kept as the only comment: `--step--1` … `--step-3` (clamp between 16px@328px viewport / ratio 1.125 and 18px@1215px / ratio 1.2). Heading map: h1→step-3, h2→step-2, h3→step-1, h4→step-0, h5/h6→step--1.
- **Two font weights only**: `--font-weight-normal: 400; --font-weight-medium: 450` (450 exploits the variable font; mono rounds to 500).
- **Constant-leading system**: `--leading-offset: 0.65rem`; every line-height is `calc(var(--leading-offset) + 1em)` — absolute leading added to font size, so vertical rhythm stays uniform across sizes.
- `--tracking-tight: -0.015em` applied to `*` universally.
- `--measure: 40rem` — prose column width cap.
- Prose derived colors: `--prose-foreground: color-mix(in oklab, var(--foreground) 80%, transparent)`, `--prose-marker: … 30% …`.
- `text-wrap: pretty` on body, `text-wrap: balance` on headings.
- Link styling is centralized and CSS-var driven: underline color is `var(--underline, transparent)`; contexts opt in by setting `--underline` (e.g. `prose-content a { --underline: var(--muted-foreground) }`; `post-tags { --underline: transparent }`). Hover always → `currentColor`. `text-decoration-thickness: max(1px, 0.0625em); text-underline-position: under; text-underline-offset: -0.06em; text-decoration-skip-ink: none`.

### Color tokens & light/dark (`src/styles/color.css`)

- 12-step Radix-style gray ramp + red, **every value defined once via `light-dark()`** — no duplicated theme blocks, no `.dark` class:

```css
:root {
  --gray-1: light-dark(#fcfcfc, #111111);
  /* … gray-2 #f9f9f9/#191919, gray-3 #f0f0f0/#222222, gray-4 #e8e8e8/#2a2a2a,
     gray-5 #e0e0e0/#313131, gray-6 #d9d9d9/#3a3a3a, gray-7 #cecece/#484848,
     gray-8 #bbbbbb/#606060, gray-9 #8d8d8d/#6e6e6e, gray-10 #838383/#7b7b7b,
     gray-11 #646464/#b4b4b4, gray-12 #202020/#eeeeee */
  --red-9: light-dark(#e5484d, #e5484d);
  --red-11: light-dark(#ce2c31, #ff9592);

  --background: var(--gray-1);
  --foreground: var(--gray-12);
  --primary: var(--gray-12);
  --primary-foreground: var(--gray-1);
  --muted: var(--gray-3);
  --muted-foreground: var(--gray-11);
  --destructive: var(--red-11);
  --border: var(--gray-6);
  --ring: var(--gray-8);

  color-scheme: light dark;
}
```

- **Theme mechanism** (3 pieces, no flash, respects system default):
  1. `:root { color-scheme: light dark }` (auto) + in `ThemeToggle.astro` global style: `:root[data-theme="light"] { color-scheme: light }` / `:root[data-theme="dark"] { color-scheme: dark }`. Setting `color-scheme` flips every `light-dark()` at once.
  2. Pre-paint inline head script: `const theme = localStorage.theme; if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme`.
  3. Toggle handler: computes current effective theme (dataset OR `matchMedia("(prefers-color-scheme: dark)")`), flips, writes `root.dataset.theme` + `localStorage.theme`. Sun/moon icons swapped purely in CSS via `:root[data-theme="dark"] light-icon { display: none }` plus `@media (prefers-color-scheme: dark) { :root:not([data-theme]) … }` for the unset case.
- Global element defaults piggyback on the token file:

```css
*,
::before,
::after,
::backdrop,
::file-selector-button {
  border-color: var(--border);

  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 0.25rem;
    border-radius: var(--radius-sm);
  }
}
body {
  background-color: var(--background);
  color: var(--foreground);
}
```

- Derived color everywhere via `color-mix(in oklab, X n%, transparent)` (hover washes, tag text, translucent bars) and relative color syntax for callout text: `light-dark(oklch(from var(--accent) 0.48 calc(c * 1.05) h), oklch(from var(--accent) 0.83 calc(c * 0.5) h))` — one accent hex per variant generates readable light+dark text automatically.

### Spacing / layout tokens (`src/styles/layout.css`)

- Utopia fluid space scale, single tokens `--space-3xs…--space-3xl` + fluid pairs `--space-3xs-2xs…--space-2xl-3xl` (full block in §4).
- Grid math as tokens: `--grid-max-width: 75.94rem; --grid-gutter: var(--space-s-m); --grid-columns: 12;` plus computed `--grid-edge` (distance from viewport edge to grid content, used to fixed-position rails) and `--grid-column-width` (used to size fixed rails to N tracks). `--page-offset-top/-bottom` for sticky offsets.
- Mobile scroll-padding driven by component presence: `@media (width < 64rem)` sets `--bar-nav-height` calc; `&:has(page-toc)` adds `--bar-toc-height`; `scroll-padding-block-start: calc(nav + toc + gap)`. `scrollbar-gutter: stable` on html.

### Shape tokens (`src/styles/shape.css`) — full file

```css
:root {
  --radius-xs: 0.125rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;
  --radius-4xl: 2rem;
  --radius-full: 9999px;

  --blur-xs: 4px;
  --blur-sm: 8px;
  --blur-md: 12px;
  --blur-lg: 16px;
  --blur-xl: 24px;
  --blur-2xl: 40px;
  --blur-3xl: 64px;

  --aspect-video: 16 / 9;
}
```

### Media/container queries

- **No container queries anywhere.** All responsive behavior is rem-based media range syntax: `@media (width < 64rem)`, `@media (width >= 40rem)`, `@media (width < 26rem)`. Only 3 breakpoints total (26/40/64rem); 64rem is _the_ layout breakpoint (sidebar/TOC rails vs. sticky top bar).
- `@media (hover: none)` → heading anchors always visible on touch. `@media (prefers-reduced-motion: reduce)` in reset. `@supports` used only for browser-engine forks in math CSS.
- Queries are nested inside selectors (native nesting), placed at the end of each rule — "desktop styles + mobile override block" pattern per component.

## 2. Component Authoring Patterns

### Scoping & structure

- Every component: frontmatter (script) → markup → scoped `<style>` → optional `<script>` (client JS). Astro-scoped styles ≈ Svelte scoped styles; direct port.
- `is:global` used exactly once (ThemeToggle's `:root[data-theme]` rules — genuinely global state). Global "utilities" live in `src/styles/*.css` instead of global component styles.
- `:global(img)` escape hatch only for framework-generated children (Astro `<Image>` output).

### Custom elements as styling hooks (the signature pattern)

Non-registered custom elements replace both `<div class="...">` and utility classes. They are semantic, free of collision (scoped styles target the tag directly), and self-documenting in devtools. Full inventory: `page-grid, page-header, page-nav, page-toc, page-content, page-footer, prose-content, entry-info, entry-meta, entry-authors, author-avatars, author-names, entry-tags, post-meta, post-authors, post-tags, post-banner, post-actions, toc-title, toc-current, sidebar-inner, sidebar-toggle, dictionary-entry, etymology-span, ipa-span, tag-count, light-icon, dark-icon, math-display`. Rules:

- Custom elements default to `display: inline`; each gets an explicit `display` (`block`/`flex`/`grid`/`contents`).
- Naming: `context-part` kebab-case; **`-span` suffix = phrasing content** (the markdown pipeline in `normalize-list-items.ts` treats `*-span` tags as inline, other hyphenated tags as block).
- Native HTML elements are used whenever one fits (`aside`, `nav`, `time`, `details/summary`, `li` as component root when the component _is_ a list item — `BlogCard`, `ProjectCard`, `AuthorCard` all render `<li>` and the page supplies `<ul>`).

### Data attributes: shared styles, variants, and state

- **Shared cross-component styling** = global attribute selector files: `[data-icon-button]` (icon-button.css — a 2rem hover-highlighted square; applied to `<button>` and `<a>` alike), `[data-bar]` (mobile translucent bar chrome: `background-color: color-mix(in oklab, var(--background) 90%, transparent); backdrop-filter: blur(var(--blur-sm)); border-image` trick to inset the border to the prose measure).
- **Variants** = attribute values: `data-callout="note|tip|warning|caution|important"` where each variant only overrides one custom property (`[data-callout="note"] { --accent: #0090ff; }`); `data-depth="3|4"` sets `--indent: 1|2`, consumed by `padding-inline-start: calc((var(--shift, 0) + var(--indent, 0)) * var(--space-xs))`.
- **JS↔CSS state** = boolean attributes toggled with `el.toggleAttribute("data-active", bool)` / `data-visible` / `data-floating` — never classList. CSS selects `&[data-visible]`, `a[data-active]`.
- **Numeric JS→CSS** = custom properties: scroll progress ring sets `--progress` (0–1) once; CSS renders it: `stroke-dashoffset: calc(var(--circumference) * (1 - var(--progress, 0)))` with `--circumference: calc(2 * pi * 6.5px)` (CSS `pi`).

### Component customization API

- Props for content/data only (`post`, `links`, `crumbs`, `title`, `sections`, `floating?`, `prev?/next?`).
- CSS custom properties for visual contract between parent and child: `--underline` (link underline color, read by global `a` rule), `--accent` (callout), `--shift`/`--indent` (TOC indentation). Parent sets, descendant consumes with fallback: `var(--underline, transparent)`.
- Slots for composition (`slot="head"`, `slot="toc"`, `slot="actions"`); layout conditionally renders regions via `Astro.slots.has("toc")` → Svelte equivalent: snippet props + `{#if children}`.

### Interactivity without JS

- `<details>/<summary>` for callouts (open by default, `closed` attr flips) and TOC section groups; chevron rotation via `details[open] > summary svg { rotate: 180deg }`; `summary { list-style: none }` + `::-webkit-details-marker { display: none }`.
- **Checkbox hack** for the mobile TOC dropdown: visually-hidden `<input type="checkbox">` inside a `<label>`; panel shown by `nav:has(input:checked) > ul { display: flex }`; focus ring recreated with `nav:has(input:focus-visible) label { outline: … }`; chevron flip `nav:has(input:checked) label > svg:last-of-type { rotate: 180deg }`.
- `:has()` used liberally: parent-state selectors (`details:not([open]):has(a[data-active]) summary a { color: var(--foreground) }` — closed group highlights when a child is active), document-level layout switches (`html:has(page-toc)`).
- Animated reveal without JS measurement: `toc-title { display: grid; grid-template-rows: 0fr; > span { min-height: 0; overflow: hidden } &[data-visible] { grid-template-rows: 1fr } }`.
- Generated content for separators: `entry-authors ~ time::before { content: "·" }`, `time ~ entry-tags::before { content: "·" }` — separators only appear when both siblings exist; zero conditional logic in markup.
- CSS counters for the dictionary list and math equation numbers.
- Heading anchor links (`#`) injected at build time; visibility purely CSS (`opacity: 0` → `:is(:hover, :target) [data-heading-anchor] { opacity: 1 }`, always visible under `@media (hover: none)`).
- Disabled-link pattern: prev/next arrows render `<a>` without `href` when absent; CSS: `a:not([href]) { color: var(--muted-foreground); opacity: 0.5; pointer-events: none }` + `aria-hidden`.
- No `popover` or anchor-positioning used (site has no overlays); the toolbox is details/checkbox/:has/generated-content.

### Minimal JS where needed

- Vanilla TS module scripts colocated in the component. Pattern: IIFE with early-return guards (`const nav = document.querySelector(...); if (!nav) return`), `matchMedia` for breakpoint-gated behavior, `addEventListener("scroll", fn, { passive: true })`, IntersectionObserver for scrollspy (TOC active section, title visibility, series-reader URL sync with `rootMargin: "-20% 0px -79% 0px"` reading band).
- Event delegation on `document` with `closest()` (`[data-scroll-top]`, series-reader link interception) instead of per-element listeners.
- JS only computes state; CSS renders it (toggleAttribute / setProperty). JS never sets styles directly except custom properties.
- `SeriesReader.astro` is a markup-less component: two `<script>`s only (one `is:inline` pre-paint scroll restoration, one module for scroll-driven `history.replaceState` URL + `document.title` + breadcrumb sync). Guards against modified-click (`metaKey/ctrlKey/shiftKey/altKey`), `download`/`target` links, cross-origin.

### Accessibility discipline (consistent, port wholesale)

- Icon-only controls: `aria-label` + `title`; decorative SVGs `aria-hidden="true"`.
- Duplicate links to same destination (card thumbnail + title): thumbnail link gets `tabindex="-1" aria-hidden="true"` with empty `alt`.
- `aria-current="page"` on nav, `aria-current="location"` on active TOC link.
- `<time datetime={iso}>` everywhere dates appear; `formatDate` via `Intl.DateTimeFormat` with `timeZone: "UTC"`.
- Global focus-visible ring; `scroll-margin-block-start` on headings tuned per breakpoint; `overscroll-behavior: contain` on scrollable TOC.

## 3. Code Conventions Worth Porting to Svelte

- **Formatting**: double quotes, no semicolons, 2-space, 80 cols; CSS hand-formatted with vertically aligned values in token blocks (`--gray-1:  light-dark(…)` padding). Biome CSS formatter deliberately disabled to preserve alignment.
- **Import order** in component frontmatter: (Layout only: global CSS first) → assets/icons → components → consts/lib utils → `type` imports last within their path group; `astro:*` builtins after local `@/` imports. All imports absolute via `@/` alias; zero relative imports.
- **Prop typing**: one inline `type Props = { … }` alias per component (never interface, never inline generic), destructure with defaults: `const { crumbs = [] } = Astro.props`. Optional props are genuinely optional (`floating?: boolean`) and forwarded as attribute-or-undefined: `data-floating={floating || undefined}`, `open={open || undefined}`, `aria-hidden={!prev || undefined}` — attribute absence, not `="false"`.
- **File naming**: `PascalCase.astro` components, `kebab-case.ts` lib modules, `kebab-case.css` styles. Components flat in `src/components/` (no subfolders); lib modules one-concern-per-file; multi-file concern gets a folder with `index.ts` (`lib/expressive-code/`).
- **Comment discipline**: near-zero. The only comments in the entire `src/styles` + components are two Utopia generator URLs recording where token values came from. Code reads through naming.
- **Error handling**: build-time plugins wrap risky work in try/catch and `ctx.report({ severity: "warning" })` with the offending input in the message — never crash the build on one bad node. Runtime: defensive `try { decodeURIComponent(x) } catch { fallback }`; DOM scripts early-return when prerequisites missing.
- **Small pure helpers**: `lib/utils.ts` is 23 lines, 4 functions (`formatDate`, `isSubpost`, `subpostSlug`, `normalizePath`, `hashId`). `export const fn = (x) => …` for one-liners, `export function` for bodies. `as const` on SITE config. Data-fetching helpers (`getPosts/getSubposts/getTags`) return sorted `Map`s, use `Map.groupBy`.
- **Config centralization**: `src/consts.ts` holds SITE, NAVIGATION, SOCIALS (icon components imported and passed as data).
- **Pages are thin**: fetch → map to components; page-specific layout styles live in the page's scoped `<style>` (e.g. blog index is 24 lines total).
- Note for the rewrite: `noUncheckedIndexedAccess`-style strictness is _not_ fully met here (e.g. `id.split("/")[1]` unchecked) — the user's global standards are stricter than this repo; follow the standards where they exceed it.

## 4. Artifacts to Copy Nearly Verbatim

### 4.1 `reset.css` — copy whole file

```css
*,
::after,
::before,
::backdrop,
::file-selector-button {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0 solid;
}

html,
:host {
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
  tab-size: 4;
  -webkit-tap-highlight-color: transparent;
}

hr {
  height: 0;
  color: inherit;
  border-top-width: 1px;
}

abbr:where([title]) {
  -webkit-text-decoration: underline dotted;
  text-decoration: underline dotted;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-size: inherit;
  font-weight: inherit;
}

a {
  color: inherit;
  -webkit-text-decoration: inherit;
  text-decoration: inherit;
}

b,
strong {
  font-weight: bolder;
}

code,
kbd,
samp,
pre {
  font-size: 1em;
}

small {
  font-size: 80%;
}

sub,
sup {
  font-size: 75%;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}
sub {
  bottom: -0.25em;
}
sup {
  top: -0.5em;
}

table {
  text-indent: 0;
  border-color: inherit;
  border-collapse: collapse;
}

:-moz-focusring {
  outline: auto;
}
progress {
  vertical-align: baseline;
}
summary {
  display: list-item;
}

ol,
ul,
menu {
  list-style: none;
}

img,
svg,
video,
canvas,
audio,
iframe,
embed,
object {
  display: block;
  vertical-align: middle;
}
img,
video {
  max-width: 100%;
  height: auto;
}

button,
input,
select,
optgroup,
textarea,
::file-selector-button {
  font: inherit;
  font-feature-settings: inherit;
  font-variation-settings: inherit;
  letter-spacing: inherit;
  color: inherit;
  border-radius: 0;
  background-color: transparent;
  opacity: 1;
}

:where(select:is([multiple], [size])) optgroup {
  font-weight: bolder;
}
:where(select:is([multiple], [size])) optgroup option {
  padding-inline-start: 20px;
}
::file-selector-button {
  margin-inline-end: 4px;
}

::placeholder {
  opacity: 1;
}
@supports (not (-webkit-appearance: -apple-pay-button)) or
  (contain-intrinsic-size: 1px) {
  ::placeholder {
    color: color-mix(in oklab, currentcolor 50%, transparent);
  }
}

textarea {
  resize: vertical;
}

::-webkit-search-decoration {
  -webkit-appearance: none;
}
::-webkit-date-and-time-value {
  min-height: 1lh;
  text-align: inherit;
}
::-webkit-datetime-edit {
  display: inline-flex;
}
::-webkit-datetime-edit-fields-wrapper {
  padding: 0;
}
::-webkit-datetime-edit,
::-webkit-datetime-edit-year-field,
::-webkit-datetime-edit-month-field,
::-webkit-datetime-edit-day-field,
::-webkit-datetime-edit-hour-field,
::-webkit-datetime-edit-minute-field,
::-webkit-datetime-edit-second-field,
::-webkit-datetime-edit-millisecond-field,
::-webkit-datetime-edit-meridiem-field {
  padding-block: 0;
}
::-webkit-calendar-picker-indicator {
  line-height: 1;
}

:-moz-ui-invalid {
  box-shadow: none;
}

button,
input:where([type='button'], [type='reset'], [type='submit']),
::file-selector-button {
  appearance: button;
}

::-webkit-inner-spin-button,
::-webkit-outer-spin-button {
  height: auto;
}

[hidden]:where(:not([hidden='until-found'])) {
  display: none !important;
}

@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 4.2 `color.css` — copy whole file (swap palette for rCTF brand later)

Full file quoted in §1 (gray ramp + semantic aliases + `color-scheme: light dark` + global border-color/focus-visible/body block). The three-part theme mechanism to replicate in SvelteKit:

```html
<!-- app.html, before body paints -->
<script>
  const theme = localStorage.theme
  if (theme === 'light' || theme === 'dark')
    document.documentElement.dataset.theme = theme
</script>
```

```css
:root[data-theme='light'] {
  color-scheme: light;
}
:root[data-theme='dark'] {
  color-scheme: dark;
}
```

```ts
const toggleTheme = () => {
  const root = document.documentElement
  const dark =
    root.dataset.theme === 'dark' ||
    (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
  const theme = dark ? 'light' : 'dark'
  root.dataset.theme = theme
  localStorage.theme = theme
}
```

### 4.3 Typography tokens (`typography.css` `:root` + base rules)

```css
:root {
  /* https://utopia.fyi/type/calculator?c=328,16,1.125,1215,18,1.2,3,1,&s=0.75|0.5|0.25,1.5|2|3|4|6,s-l|s-m&g=s,m,2xl,12 */
  --step--1: clamp(0.8889rem, 0.8709rem + 0.0877vw, 0.9375rem);
  --step-0: clamp(1rem, 0.9538rem + 0.2255vw, 1.125rem);
  --step-1: clamp(1.125rem, 1.0418rem + 0.4059vw, 1.35rem);
  --step-2: clamp(1.2656rem, 1.1346rem + 0.6392vw, 1.62rem);
  --step-3: clamp(1.4238rem, 1.2315rem + 0.9383vw, 1.944rem);

  --font-weight-normal: 400;
  --font-weight-medium: 450;

  --tracking-tight: -0.015em;
  --leading-offset: 0.65rem;

  --prose-foreground: color-mix(in oklab, var(--foreground) 80%, transparent);
  --prose-marker: color-mix(in oklab, var(--foreground) 30%, transparent);

  --measure: 40rem;
}

*,
::before,
::after,
::backdrop,
::file-selector-button {
  letter-spacing: var(--tracking-tight);
}

body {
  font-family: var(--font-sans);
  text-wrap: pretty;
}

:where(h1, h2, h3, h4, h5, h6) {
  text-wrap: balance;
}

a {
  text-decoration: underline;
  text-decoration-color: var(--underline, transparent);
  text-decoration-thickness: max(1px, 0.0625em);
  text-decoration-skip-ink: none;
  text-underline-position: under;
  text-underline-offset: -0.06em;

  &:hover {
    text-decoration-color: currentColor;
  }
}
```

### 4.4 Space scale (`layout.css` `:root`)

```css
:root {
  /* https://utopia.fyi/grid/calculator?c=320,16,1.125,1024,18,1.2,6,1,&s=0.75%7C0.5%7C0.25,1.5%7C2%7C3%7C4%7C6,s-l%7Cs-m&g=s,m,2xl,12 */
  --space-3xs: clamp(0.25rem, 0.2269rem + 0.1127vw, 0.3125rem);
  --space-2xs: clamp(0.5rem, 0.4769rem + 0.1127vw, 0.5625rem);
  --space-xs: clamp(0.75rem, 0.7038rem + 0.2255vw, 0.875rem);
  --space-s: clamp(1rem, 0.9538rem + 0.2255vw, 1.125rem);
  --space-m: clamp(1.5rem, 1.4307rem + 0.3382vw, 1.6875rem);
  --space-l: clamp(2rem, 1.9076rem + 0.451vw, 2.25rem);
  --space-xl: clamp(3rem, 2.8613rem + 0.6764vw, 3.375rem);
  --space-2xl: clamp(4rem, 3.8151rem + 0.9019vw, 4.5rem);
  --space-3xl: clamp(6rem, 5.7227rem + 1.3529vw, 6.75rem);

  --space-3xs-2xs: clamp(0.25rem, 0.1344rem + 0.5637vw, 0.5625rem);
  --space-2xs-xs: clamp(0.5rem, 0.3613rem + 0.6764vw, 0.875rem);
  --space-xs-s: clamp(0.75rem, 0.6113rem + 0.6764vw, 1.125rem);
  --space-s-m: clamp(1rem, 0.7458rem + 1.2401vw, 1.6875rem);
  --space-m-l: clamp(1.5rem, 1.2227rem + 1.3529vw, 2.25rem);
  --space-l-xl: clamp(2rem, 1.4915rem + 2.4803vw, 3.375rem);
  --space-xl-2xl: clamp(3rem, 2.4453rem + 2.7057vw, 4.5rem);
  --space-2xl-3xl: clamp(4rem, 2.9831rem + 4.9605vw, 6.75rem);

  --grid-max-width: 75.94rem;
  --grid-gutter: var(--space-s-m);
  --grid-columns: 12;
  --grid-edge: max(
    var(--grid-gutter),
    (100% - var(--grid-max-width)) / 2 + var(--grid-gutter)
  );
  --grid-column-width: calc(
    (
        min(100%, var(--grid-max-width)) - (var(--grid-columns) + 1) *
          var(--grid-gutter)
      ) /
      var(--grid-columns)
  );

  --page-offset-top: var(--space-xl);
  --page-offset-bottom: var(--space-m);
}
```

### 4.5 `shape.css` — full file quoted in §1; copy as-is.

### 4.6 `icon-button.css` — the shared-attribute-utility exemplar

```css
[data-icon-button] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-md);
  cursor: pointer;

  &:hover {
    background-color: color-mix(in oklab, var(--muted) 50%, transparent);
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
}
```

### 4.7 Prose base (`prose-content`) — the pattern for rCTF markdown rendering (challenge descriptions)

```css
prose-content {
  display: block;
  font-size: var(--step-0);
  line-height: calc(var(--leading-offset) + 1em);
  color: var(--foreground);
  text-wrap: pretty;
  overflow-wrap: break-word;

  :where(
    p,
    ul,
    ol,
    blockquote,
    pre,
    table,
    figure,
    hr,
    details,
    math-display,
    .expressive-code
  ) {
    margin-block: 0 1em;
  }

  > :first-child {
    margin-block-start: 0;
  }
  > :last-child {
    margin-block-end: 0;
  }

  :is(p, li) {
    color: var(--prose-foreground);
  }
}
```

(Owns _all_ markdown element styling in the `typography-*` files nested under this one tag — the SPA equivalent is a `<ProseContent>` wrapper component or a global `prose-content { … }` sheet.)

### 4.8 Fallback font metrics — quoted in §1; copy the `@font-face` fallback blocks and `:root` font tokens as-is if keeping IBM Plex.

## Translation Notes for the Svelte Rewrite

- Astro scoped `<style>` → Svelte scoped `<style>` is one-to-one; custom-element tags work in Svelte templates and scoped selectors without config.
- Astro named slots (`slot="head"/"toc"/"actions"`) → Svelte 5 snippet props; `Astro.slots.has()` → `{#if snippet}`.
- Colocated `<script>` DOM code (IntersectionObserver scrollspy, scroll listeners) → `$effect`/attachments; keep the same JS→CSS contract (toggle data attributes, set custom properties; never inline styles/classes).
- The erudite site is MPA/static; rCTF is an SPA — the pre-paint theme script must go in `app.html`, and per-page `<title>`/meta (MetaPage/MetaPost pattern: canonical, og:_, twitter:_, noindex flag) becomes `<svelte:head>` per route.
- Zag.js components should follow the same conventions: state surfaced as data attributes (Zag already emits `data-state`, `data-part`), styled by attribute selectors in scoped CSS, tokens from the global files — no wrapper class systems.
- Global stylesheet import order matters (reset before tokens before element rules); import the `src/styles/*.css` chain once in the root `+layout.svelte`.

Key file paths: `/Users/enscribe/Repositories/jktrn/astro-erudite/src/styles/{reset,fonts,color,typography,layout,shape,icon-button,bar,callout}.css`, `src/layouts/Layout.astro`, `src/components/{ThemeToggle,TableOfContents,ScrollToTop,Sidebar,BlogCard,ProjectCard,AuthorCard,SocialIcons,PostActions,SeriesReader,Footer,MetaHead,MetaPage,MetaPost}.astro`, `src/lib/{utils,content}.ts`, `src/consts.ts`, `biome.json`, `tsconfig.json`.
