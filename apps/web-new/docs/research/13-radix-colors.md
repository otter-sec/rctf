# Radix Colors — palette reference for web-new

Decision (2026-07-01): the raw palette (old "Layer B", previously Tailwind v4
oklch scales) is replaced by **Radix Colors values, vendored — not a
dependency**. We copy hex values for the scales we use into `src/styles/color.css`
as `light-dark()` pairs. The documented Layer C semantic token _names_
(`--background-l0..l5`, category ramps, scoreboard colors, …) are unchanged;
only the values behind them change.

Sources: radix-ui.com/colors docs (usage, scales, composing-a-palette,
understanding-the-scale). Vendor values from the MIT-licensed
`radix-ui/colors` repo (github.com/radix-ui/colors, latest 3.x) — each scale
ships `<scale>.css` (light, on `:root`) and `<scale>-dark.css`, custom
properties `--<scale>-1..12` and alpha `--<scale>-a1..a12`. Copy the hex
values verbatim (traceable to source); we do not import their CSS files or
their `.dark-theme` class convention — our theme mechanism stays
`light-dark()` + `color-scheme` + `data-theme`.

## The 12-step scale (what each step is for)

| Step | Designated use                                   |
| ---- | ------------------------------------------------ |
| 1    | App background                                   |
| 2    | Subtle background (cards, sidebars, code blocks) |
| 3    | UI element background                            |
| 4    | Hovered UI element background                    |
| 5    | Active / selected UI element background          |
| 6    | Subtle borders, separators (non-interactive)     |
| 7    | UI element border, focus rings                   |
| 8    | Hovered UI element border / stronger focus       |
| 9    | Solid background (highest chroma step)           |
| 10   | Hovered solid background                         |
| 11   | Low-contrast text                                |
| 12   | High-contrast text                               |

Guarantees: steps 11/12 meet APCA Lc 60 / Lc 90 over step-2 backgrounds.
**Bright-scale exception**: `sky, mint, lime, yellow, amber` expect _dark_
text on steps 9–10 (all other scales expect white). Alpha variants (`a1–a12`)
are the same colors as transparency over white (light) / black (dark) —
designed for layering over arbitrary backgrounds. Radix scales are not meant
to be customized ("any customisation would likely break these features") —
vendor verbatim, don't tweak steps.

Available scales — grays: gray, mauve, slate, sage, olive, sand; colors:
gold, bronze, brown, yellow, amber, orange, tomato, red, ruby, crimson, pink,
plum, purple, violet, iris, indigo, blue, cyan, teal, jade, green, grass,
lime, mint, sky; plus black/white alpha overlay scales.

## Token mapping (Layer C names → Radix steps)

Every value below is `light-dark(<light-scale hex>, <dark-scale hex>)`.
Neutral = **gray** (pure gray; the old palette was zero-chroma neutral).

### Layered ladders

| Token                 | Radix            | Note                                                                                                      |
| --------------------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| `--background-l0`     | gray 1           | app background                                                                                            |
| `--background-l1`     | gray 2           | cards / subtle                                                                                            |
| `--background-l2`     | gray 3           | UI element bg                                                                                             |
| `--background-l3`     | gray 4           | hover bg                                                                                                  |
| `--background-l4`     | gray 5           | active/selected bg                                                                                        |
| `--background-l5`     | gray 6           | strongest emphasis bg (old "secondary hover")                                                             |
| `--border`            | gray 6           | non-interactive borders                                                                                   |
| `--ring`              | gray 8           | focus rings (step 7 for interactive borders if needed)                                                    |
| `--foreground-l0`     | gray 12          | high-contrast text                                                                                        |
| `--foreground-l1`     | gray 11          | low-contrast text                                                                                         |
| `--foreground-l2..l5` | gray 10, 9, 8, 7 | decorative ladder — only l0/l1 carry Radix contrast guarantees; tune during styling if a step reads wrong |

### Semantic

| Token                                 | Radix                                               |
| ------------------------------------- | --------------------------------------------------- |
| `--background-accent` / `-hover`      | sky 4 / sky 5 (old accent hue was sky)              |
| `--foreground-accent`                 | sky 11                                              |
| `--background-destructive` / `-hover` | red 4 / red 5                                       |
| `--foreground-destructive`            | red 11                                              |
| `--background-success`                | jade 3 (emerald-like; `green` acceptable alternate) |
| `--foreground-success`                | jade 11                                             |

The soft-wash pattern (old: `sky-200 @ 50%` color-mixes) is exactly Radix
steps 3–5; no mixing needed.

### Scoreboard

| Token                                            | Radix                                               |
| ------------------------------------------------ | --------------------------------------------------- |
| `--background-gold`, `--foreground-gold-{l0,l1}` | **gold** scale: bg a3, fg 11 / 12                   |
| silver set                                       | **slate** (no literal silver): bg a3, fg 11 / 12    |
| bronze set                                       | **bronze** scale: bg a3, fg 11 / 12                 |
| self set                                         | jade: bg 3 / 4, fg 11 (old self was emerald-tinted) |
| nth set                                          | gray ladder mappings, as today                      |

### Graph series (`--foreground-first..tenth`)

Step 9 (highest chroma) of ten scales; if dark-mode lines read too dim,
promote dark values to step 10/11 during the styling pass:

red, amber, lime, jade, cyan, sky, blue, violet, plum, pink.

(Old palette's fuchsia → Radix **plum**; emerald → **jade**. Radix has no
fuchsia/emerald.)

### Prose

| Token                            | Radix                                                              |
| -------------------------------- | ------------------------------------------------------------------ |
| `--foreground-prose`             | gray 11 (matches fg-l1 mapping, as today)                          |
| `--foreground-prose-link`        | sky 11                                                             |
| `--foreground-prose-inline-code` | light-dark(gray 11, red 11) — preserves the old dark-mode red tint |

### Category ramps (documented per-hue 5-token sets)

Alpha steps replace the old hand-built transparent color-mixes — they layer
correctly over any background by construction:

| Token                         | Radix step |
| ----------------------------- | ---------- |
| `--background-{hue}-l0`       | {hue} a3   |
| `--background-{hue}-l1`       | {hue} a2   |
| `--background-{hue}-l1-hover` | {hue} a4   |
| `--foreground-{hue}-l0`       | {hue} 11   |
| `--foreground-{hue}-l1`       | {hue} a11  |

Hue mapping (documented palette name → Radix scale): red→red,
orange→orange, yellow→yellow, green→green, teal→teal, blue→sky (old "blue"
was sky-based), purple→purple, pink→pink, fuchsia→**plum**, gray→gray.
The `--category-*` indirection mechanism is unchanged.

## Vendoring procedure (Phase 0)

1. Pull hex values from `radix-ui/colors` (npm dist CSS or `src/*.ts`) for:
   gray, sky, red, jade, gold, bronze, slate, amber, lime, cyan, blue,
   violet, plum, pink, orange, yellow, green, teal, purple (+ alpha variants
   for the category/scoreboard tokens).
2. Emit into `color.css` as scale tokens defined once via `light-dark()`
   (`--gray-1: light-dark(#fcfcfc, #111111)` — erudite's exact pattern),
   then map Layer C semantic tokens onto them per the tables above.
3. Only include scales/steps actually referenced — no blanket 30-scale dump.
4. Record the vendored version in a comment at the top of `color.css`
   (the file's one permitted comment, like the Utopia URLs).
5. P3/wide-gamut variants: skip for now; revisit in the styling pass.

Docs impact (Phase 6): `theming/colors.md` currently documents OKLCH +
Tailwind-derived values and `@theme inline` utilities — it will be rewritten
around the Radix-sourced values and plain CSS variables. Token names persist.
