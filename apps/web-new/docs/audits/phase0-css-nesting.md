All refactors verified against the installed toolchain. Compiling the report.

# CSS Audit — apps/web-new component style blocks

**Verification method:** every proposed block below was compiled with the installed Svelte 5.55.7 compiler (`node_modules/svelte/src/compiler/index.js`) against the component's real markup — zero CSS warnings, and emitted CSS was diffed against the original's output to confirm identical scoping/specificity semantics (Svelte scopes the top-level selector and adds `:where(.svelte-hash)` to nested element selectors, exactly matching the flat originals' output).

**Doc grounding:**

- Svelte scoped styles (svelte.dev/docs/svelte/scoped-styles, via official Svelte MCP): scoping class per selector, +0-1-0 specificity, `:where(.svelte-xyz)` after first occurrence.
- Svelte global styles (svelte.dev/docs/svelte/global-styles, via official Svelte MCP): `div :global(strong)` descendant form; `:global {}` block; "the nested form is preferred".
- Installed compiler ground truth: `&` nesting supported (`NestingSelector`; error `css_nesting_selector_invalid_placement`: "Nesting selectors can only be used inside a rule or as the first selector inside a lone `:global(...)`"); `:global(...)` "can be at the start or end of a selector sequence, but not in the middle" (`css_global_invalid_placement`). The `:global(:root[…]) &` ancestor idiom compiles and scopes correctly (verified; emits `:root[…] moon-icon.svelte-x` equivalent).
- Zag toast ground truth: `node_modules/@zag-js/toast/dist/toast.utils.mjs:35` inlines `zIndex: MAX_Z_INDEX` on the group (so toast-host's `!important` is required), and lines 78–128 set `--opacity/--z-index/--x/--y/--height/--scale` (so toast-item's var usage is correct for the installed 1.41.2).
- Tokens: `src/styles/typography.css:9-10` (`--font-weight-medium: 450`), `layout.css` (`--space-*`), `shape.css` (`--radius-*`), `layers.css` (`--layer-*`).
- Reset (Preflight-style), `src/styles/reset.css`: lines 1–10 (`* { margin: 0; padding: 0; border: 0 solid }`), lines 121–135 (button/input/textarea get `font: inherit; color: inherit; background-color: transparent; border-radius: 0`).
- House style: `/Users/enscribe/Repositories/jktrn/astro-erudite/src/styles/callout.css` (nested block + one-line `--accent` attribute-variant map at end), `BlogCard.astro` (deep `&`/element nesting, nested `:global(img)`), `apps/web-new/docs/ARCHITECTURE.md` §styling (~lines 108–123: explicit `display` on custom elements; media queries range-syntax at end of each rule; minimal transitions; custom-property variants).

---

## Findings

### src/lib/components/markdown-alert.svelte

- [ANTI-PATTERN] markdown-alert.svelte:87-149 — `markdown-alert[data-type=…]` prefix repeated 8× as flat rules (5 variant one-liners plus 3 scattered connection rules), the exact "selector hell" the house style avoids.
  - evidence: erudite callout.css:1-73 — one nested `[data-callout]` block with a one-line `--accent` variant map; Svelte 5.55.7 compiles `&[attr]` nesting natively (compile-verified).
- [ANTI-PATTERN] markdown-alert.svelte:114 — `font-weight: 500` is the only raw font-weight in the app; the token is `--font-weight-medium` (450) and the design language caps at ~medium.
  - evidence: typography.css:9-10; ARCHITECTURE.md "No shadows, max font-weight ~medium"; erudite callout.css:20 uses `font-weight: var(--font-weight-medium)`. **Note: visual delta 500→450 on the variable font — intended normalization, not a pure no-op.**
- [STYLE] markdown-alert.svelte:151-156 — copy button lacks `cursor: pointer` (reset does not set it; every other interactive element in the app sets it). Behavioral one-liner, cursor only.
- [STYLE] markdown-alert.svelte:126-131 — `alert-body :global(> :first-child)` combinator-inside-`:global()` legacy idiom; nested `> :global(:first-child)` emits identical CSS (compile-verified).
- fix (complete block):

```svelte
<style>
  markdown-alert {
    --accent: var(--foreground-l1);

    display: block;
    margin-block: var(--space-s);

    &:not([data-type='connection']) {
      border-inline-start: 4px solid var(--accent);
      padding-inline-start: var(--space-s);
    }

    &[data-type='note'] {
      --accent: var(--foreground-blue-l1);
    }

    &[data-type='tip'] {
      --accent: var(--foreground-green-l1);
    }

    &[data-type='important'] {
      --accent: var(--foreground-purple-l1);
    }

    &[data-type='warning'] {
      --accent: var(--foreground-yellow-l1);
    }

    &[data-type='caution'] {
      --accent: var(--foreground-red-l1);
    }

    &[data-type='connection'] {
      overflow: hidden;
      border: 2px solid var(--border);
      border-radius: var(--radius-md);

      alert-header {
        padding: var(--space-3xs) var(--space-s);
        color: var(--foreground-l3);
        font-weight: inherit;
        background: var(--background-l3);
      }

      alert-body {
        padding: var(--space-3xs) var(--space-s);
      }
    }
  }

  alert-header {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    padding-block-end: var(--space-3xs);
    color: var(--accent);
    font-weight: var(--font-weight-medium);

    :global(svg) {
      flex-shrink: 0;
    }
  }

  alert-body {
    display: block;
    color: var(--foreground-prose);

    > :global(:first-child) {
      margin-block-start: 0;
    }

    > :global(:last-child) {
      margin-block-end: 0;
    }
  }

  button {
    display: flex;
    margin-inline-start: auto;
    padding: var(--space-3xs);
    cursor: pointer;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }

  a,
  code {
    display: block;
    font-family: var(--font-mono);
  }

  a {
    color: var(--foreground-prose-link);
  }
</style>
```

### src/lib/ui/toast-item.svelte

- [ANTI-PATTERN] toast-item.svelte:56-62 — `[data-part='root'][data-type=…]` variant rules repeat the root prefix instead of nesting `&[data-type=…]` in the root block (house attribute-variant pattern).
  - evidence: erudite callout.css variant map; svelte/scoped-styles (nesting compile-verified).
- [SIMPLIFICATION] toast-item.svelte:75-82 — close-trigger re-declares `padding: 0; font: inherit; color: inherit; background: none; border: none`, all already provided by the reset for `button`.
  - evidence: reset.css:1-10, 121-135.
- Correct per docs, explicitly: the 200ms `translate/scale/opacity` transition is the machine-driven stacking animation Zag's inline `--x/--y/--scale/--opacity/--height` vars depend on (toast.utils.mjs:78-128) — this is the one legitimate transition under the minimal-transitions rule, and reset.css:216-225 kills it under `prefers-reduced-motion`. Keep it.
- fix (complete block):

```svelte
<style>
  [data-part='root'] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2xs);
    inline-size: 20rem;
    height: var(--height);
    padding: var(--space-2xs) var(--space-xs);
    background: var(--background-l1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    translate: var(--x) var(--y);
    scale: var(--scale);
    opacity: var(--opacity);
    z-index: var(--z-index);
    will-change: translate, opacity, scale;
    transition:
      translate 200ms ease,
      scale 200ms ease,
      opacity 200ms ease;

    &[data-type='error'] {
      color: var(--foreground-destructive);
    }

    &[data-type='success'] {
      color: var(--foreground-success);
    }
  }

  [data-part='title'] {
    flex: 1;
    font-size: var(--step--1);
  }

  [data-part='description'] {
    flex-basis: 100%;
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }

  [data-part='close-trigger'] {
    cursor: pointer;
  }
</style>
```

(`height: var(--height)` deliberately stays physical — it mirrors Zag's physical px measurement var.)

### src/lib/ui/button.svelte

- [ANTI-PATTERN] button.svelte:69-142 — 12 flat variant/size rules with 6 detached `:hover` companions; nest everything under the base `a, button` block with `&[data-size=…]`/`&[data-variant=…] { &:hover {…} }`. Emitted specificity relations verified unchanged (base 0-1-1 < variants/sizes 0-2-1 < hovers 0-3-1; no cross-property conflicts).
- [SIMPLIFICATION] button.svelte:51,56-57 — `font: inherit`, `background: none`, `border: none` are reset-redundant for `button` (reset.css:121-135, :9) and no-ops for `a` (natural inheritance / no UA background/border).
- fix (complete block):

```svelte
<style>
  a,
  button {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    gap: var(--space-2xs);
    block-size: 2.25rem;
    padding-inline: var(--space-s);
    color: var(--foreground-l1);
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    border-radius: var(--radius-md);

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
      flex-shrink: 0;
      pointer-events: none;
    }

    &[data-size='sm'] {
      block-size: 2rem;
      padding-inline: var(--space-xs);
    }

    &[data-size='lg'] {
      block-size: 2.5rem;
      padding-inline: var(--space-m);
    }

    &[data-size='icon'] {
      inline-size: 2.25rem;
      padding-inline: 0;
    }

    &[data-size='icon-sm'] {
      inline-size: 2rem;
      block-size: 2rem;
      padding-inline: 0;
    }

    &[data-size='icon-lg'] {
      inline-size: 2.5rem;
      block-size: 2.5rem;
      padding-inline: 0;
    }

    &[data-variant='default'] {
      color: var(--foreground-accent);
      background: var(--background-accent);

      &:hover {
        background: var(--background-accent-hover);
      }
    }

    &[data-variant='destructive'] {
      color: var(--foreground-destructive);
      background: var(--background-destructive);

      &:hover {
        background: var(--background-destructive-hover);
      }
    }

    &[data-variant='outline'] {
      background: var(--background-l1);
      border: 1px solid var(--border);

      &:hover {
        background: var(--background-l2);
      }
    }

    &[data-variant='secondary'] {
      background: var(--background-l4);

      &:hover {
        background: var(--background-l5);
      }
    }

    &[data-variant='ghost']:hover {
      background: var(--background-l3);
    }

    &[data-variant='link'] {
      color: var(--foreground-prose-link);
      text-underline-offset: 4px;

      &:hover {
        text-decoration: underline;
      }
    }

    &:disabled,
    &[aria-disabled='true'] {
      pointer-events: none;
      opacity: 0.5;
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }
</style>
```

### src/lib/ui/dialog.svelte

- [ANTI-PATTERN] dialog.svelte:97-131 — three `[data-presentation=…]` / `[data-presentation=…] [data-part='content']` pairs repeat the prefix; nest content inside each presentation block.
- [SIMPLIFICATION] dialog.svelte:87,92 — `margin: 0` on title/description is reset-redundant (reset.css:7).
- Correct per docs: `--layer-*` z-index tokens; `rgb(0 0 0 / 0.5)` backdrop has no token to use — acceptable raw value.
- fix (complete block):

```svelte
<style>
  [data-part='backdrop'] {
    position: fixed;
    inset: 0;
    z-index: var(--layer-backdrop);
    background: rgb(0 0 0 / 0.5);
  }

  [data-part='positioner'] {
    position: fixed;
    inset: 0;
    z-index: var(--layer-dialog);
    display: flex;
  }

  [data-part='content'] {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--space-m);
    overflow-y: auto;
    background: var(--background-l1);
    border: 1px solid var(--border);
  }

  [data-part='title'] {
    font-size: var(--step-1);
  }

  [data-part='description'] {
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }

  [data-presentation='center'] {
    align-items: center;
    justify-content: center;
    padding: var(--space-m);

    [data-part='content'] {
      inline-size: 100%;
      max-inline-size: 28rem;
      max-block-size: 100%;
      border-radius: var(--radius-lg);
    }
  }

  [data-presentation='sheet'] {
    justify-content: flex-end;

    [data-part='content'] {
      block-size: 100%;
      inline-size: min(20rem, 90vw);
      border-block: none;
      border-inline-end: none;
    }
  }

  [data-presentation='drawer'] {
    align-items: flex-end;

    [data-part='content'] {
      inline-size: 100%;
      max-block-size: 85dvh;
      border-inline: none;
      border-block-end: none;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }
  }
</style>
```

### src/lib/ui/input.svelte

- [STYLE] input.svelte:24-31 — flat `input:focus-visible` / `input[aria-invalid='true']` should nest as `&:focus-visible` / `&[aria-invalid='true']`.
- [SIMPLIFICATION] input.svelte:17 — `font: inherit` reset-redundant (reset.css:127).
- fix (complete block):

```svelte
<style>
  input {
    display: block;
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--foreground-l0);
    background: var(--background-l1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &[aria-invalid='true'] {
      border-color: var(--foreground-destructive);
    }
  }
</style>
```

### src/lib/ui/textarea.svelte

- [STYLE] textarea.svelte:24-31 — same flat pseudo/attr rules as input; nest.
- [SIMPLIFICATION] textarea.svelte:17 — `font: inherit` reset-redundant (reset.css:127).
- fix (complete block):

```svelte
<style>
  textarea {
    display: block;
    inline-size: 100%;
    min-block-size: 4.5rem;
    padding: var(--space-3xs) var(--space-2xs);
    color: var(--foreground-l0);
    background: var(--background-l1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &[aria-invalid='true'] {
      border-color: var(--foreground-destructive);
    }
  }
</style>
```

### src/lib/ui/field.svelte

- [STYLE] field.svelte:36-38 — `form-field[data-invalid] label` repeats the prefix; nest `&[data-invalid] label` inside `form-field`.
- fix (complete block):

```svelte
<style>
  form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    inline-size: 100%;

    &[data-invalid] label {
      color: var(--foreground-destructive);
    }
  }

  field-description {
    display: block;
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }

  field-error {
    display: block;
    font-size: var(--step--1);
    color: var(--foreground-destructive);
  }
</style>
```

### src/lib/ui/empty-state.svelte

- [STYLE] empty-state.svelte:42-45 — flat `empty-state :global(svg)` should nest inside the `empty-state` block (house style: BlogCard.astro nests `:global(img)`).
- fix (complete block):

```svelte
<style>
  empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2xs);
    max-inline-size: 24rem;
    margin-inline: auto;
    padding-block: var(--space-2xl);
    text-align: center;

    :global(svg) {
      font-size: 2.5rem;
      color: var(--foreground-l4);
    }
  }

  [data-part='title'] {
    color: var(--foreground-l3);
  }

  [data-part='subtitle'] {
    font-size: var(--step--1);
    color: var(--foreground-l5);
  }
</style>
```

### src/lib/ui/checkbox.svelte

- [SIMPLIFICATION] checkbox.svelte:33 — `margin: 0` reset-redundant (reset.css:7). One-line removal:

```svelte
<style>
  label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    cursor: pointer;
  }

  input {
    inline-size: 1rem;
    block-size: 1rem;
    accent-color: var(--background-accent);
    cursor: pointer;
  }
</style>
```

### src/lib/components/theme-toggle.svelte

- [STYLE] theme-toggle.svelte:26-27 — physical `width`/`height` where the codebase (and button.svelte) uses logical `inline-size`/`block-size`.
- [STYLE] theme-toggle.svelte:44-62 — four detached `:global(:root[…]) …` rules scatter each icon's visibility logic; consolidate per-icon with the `:global(…) &` nested-ancestor idiom (compile-verified equivalent output: `:root[data-theme='dark'] moon-icon.svelte-x`, identical specificity 0-3-1).
  - evidence: svelte/global-styles ("nested form is preferred"); css_global_invalid_placement allows `:global(...)` at start of sequence; emitted-CSS diff above.
- [STYLE] theme-toggle.svelte:29,35 — `background-color` where the codebase majority uses the `background` shorthand (identical outcome; no other bg longhands set anywhere).
- fix (complete block):

```svelte
<style>
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 2.25rem;
    block-size: 2.25rem;
    font-size: var(--step-1);
    color: var(--foreground-l1);
    background: var(--background-l2);
    border-radius: var(--radius-md);
    cursor: pointer;

    &:hover {
      background: var(--background-l4);
    }
  }

  sun-icon,
  moon-icon {
    display: contents;
  }

  moon-icon {
    :global(:root[data-theme='dark']) & {
      display: none;
    }

    @media (prefers-color-scheme: dark) {
      :global(:root:not([data-theme])) & {
        display: none;
      }
    }
  }

  sun-icon {
    :global(:root[data-theme='light']) & {
      display: none;
    }

    @media (prefers-color-scheme: light) {
      :global(:root:not([data-theme])) & {
        display: none;
      }
    }
  }
</style>
```

### src/routes/+page.svelte

- [ANTI-PATTERN] +page.svelte:85-93 — the two dark-mode `img` invert rules live outside the `sponsor-grid img` block, repeating the full path; fold into the img rule with `:global(…) &` (compile-verified equivalent).
- [STYLE] +page.svelte:56-58 — `@media (width >= 48rem)` sits mid-block; ARCHITECTURE.md: media queries "live at the end of each rule".
- [STYLE] +page.svelte:75-76 — physical `width: 100%; height: auto` on img; use logical for consistency.
- [STYLE] +page.svelte:67,71 — `background-color` → `background` (codebase majority).
- fix (complete block):

```svelte
<style>
  home-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  sponsor-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-s);

    a,
    article {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-s);
      border-radius: var(--radius-md);
      background: var(--background-l2);
    }

    a:hover {
      background: var(--background-l3);
    }

    img {
      inline-size: 100%;
      block-size: auto;
      padding: var(--space-2xs);

      :global(:root[data-theme='dark']) & {
        filter: invert(1);
      }

      @media (prefers-color-scheme: dark) {
        :global(:root:not([data-theme])) & {
          filter: invert(1);
        }
      }
    }

    h3 {
      font-weight: var(--font-weight-medium);
    }

    @media (width >= 48rem) {
      grid-template-columns: 1fr 1fr;
    }
  }

  footer {
    padding-block: var(--space-s);
    text-align: center;
    font-size: var(--step--1);
    color: var(--foreground-l4);

    a {
      --underline: currentColor;
    }
  }
</style>
```

### src/routes/+layout.svelte

- [STYLE] +layout.svelte:73,82,93-94 — physical `min-height`/`border-bottom`/`width`/`max-width` where the codebase standard is logical properties.
- fix (complete block):

```svelte
<style>
  app-shell {
    display: flex;
    flex-direction: column;
    min-block-size: 100dvh;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-s);
    padding: var(--space-2xs) var(--space-s);
    border-block-end: 1px solid var(--border);

    a {
      font-weight: var(--font-weight-medium);
    }
  }

  main {
    display: flex;
    flex-direction: column;
    flex: 1;
    inline-size: 100%;
    max-inline-size: var(--page-max-width);
    margin-inline: auto;
    padding: var(--space-s);
  }
</style>
```

### src/routes/+error.svelte

- [STYLE] +error.svelte:35-36 — physical `width`/`max-width`; logical for consistency. `background-color` → `background` (line 53). Nesting already correct.
- fix (complete block):

```svelte
<style>
  error-page {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-s);

    :global(ui-card) {
      inline-size: 100%;
      max-inline-size: 28rem;
    }
  }

  error-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);

    :global(svg) {
      font-size: var(--step-2);
      color: var(--foreground-destructive);
    }

    p[role='alert'] {
      padding: var(--space-2xs);
      color: var(--foreground-destructive);
      background: var(--background-destructive);
      border-radius: var(--radius-md);
    }

    p:not([role]) {
      font-size: var(--step--1);
      color: var(--foreground-l3);
    }
  }
</style>
```

---

## Files with NO findings — current usage is correct per docs

- **card.svelte, chip.svelte, section.svelte, tooltip.svelte, markdown-timer.svelte** — flat but with zero selector repetition, explicit `display` on every custom element, full token usage. Nothing to fix.
- **spinner.svelte** — scoped `@keyframes` per svelte/scoped-styles; functional loading motion, covered by the reduced-motion kill switch (reset.css:216-225). Correct.
- **toast-host.svelte** — the `!important` on `z-index` is genuinely required: Zag inlines `zIndex: MAX_Z_INDEX` on the group element (toast.utils.mjs:35 via `getGroupPlacementStyle`), and the justification comment is present. Correct.
- **markdown.svelte, portal.svelte, all 24 lib/icons/** — no style blocks.
- `:global()` usage across the app is all _necessary_ (child-component-rendered `svg`/`ui-card`, `:root` theme ancestors) — no overuse found. Raw values without findings (`2.25rem` control heights, `0.125rem` chip padding, `2.5rem` icon size, `rgb(0 0 0 / 0.5)` backdrop) have no corresponding tokens; leaving them raw is correct under no-premature-abstraction.

## VERDICT

The CSS foundation is genuinely good: token discipline is near-total, every custom element has an explicit `display` (ARCHITECTURE rule honored), `:global()` appears only where Svelte scoping requires it, and the single transition in the codebase (toast) is the one the Zag machine needs. The debt is stylistic and concentrated: the two named files plus button.svelte and dialog.svelte were written in flat pre-nesting idiom while theme-toggle/+page/+layout/+error were written in the nested idiom — evidence of two authoring passes, not a broken design system. Highest-leverage changes: (1) the markdown-alert nested block with the one-line `--accent` variant map — it is the house-style exemplar and eliminates 8 repeated prefixes plus the only raw `font-weight` (note the deliberate 500→450 visual delta); (2) nesting button/dialog/toast-item variants and hovers (`&[data-*]`, `&:hover`), which removes ~20 flat rules with compiler-verified identical output; (3) adopting the `:global(:root[…]) &` idiom for theme-conditional rules (theme-toggle, +page) so each element's visibility logic lives in one block. Two behavior-affecting one-liners are flagged inline and are the only non-pure changes in this spec: `font-weight` 500→450 and `cursor: pointer` on the alert copy button. All 12 replacement blocks above compile warning-free under the installed Svelte 5.55.7.
