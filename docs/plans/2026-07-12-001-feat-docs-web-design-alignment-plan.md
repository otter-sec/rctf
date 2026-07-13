---
title: "feat: Align apps/docs typography with the apps/web design system"
date: 2026-07-12
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
---

# feat: Align apps/docs typography with the apps/web design system

## Summary

Apply the apps/web design language to apps/docs. Research shows the two apps already share most of the system — the same Radix gray/red scales via `light-dark()`, the same radius scale (`--radius-xs`…`--radius-full`), the same `--font-weight-medium: 450` (no true bolds), 2px `var(--border)` borders on surfaces (apps/web uses these too, so "avoiding borders" means no decorative hairlines, not zero borders — docs already matches), and identical link underline treatment. The real, visible delta is **typography**: apps/docs uses IBM Plex Sans / IBM Plex Mono with a global `-0.015em` tracking, while apps/web uses **Outfit** + **Geist Mono** with no global tracking. This plan swaps the docs fonts to Outfit + Geist Mono and removes the Plex-specific tracking, keeping the docs-specific type scale and STIX Two Math.

## Problem Frame

apps/docs (an Astro fork of astro-erudocs) visually diverges from the rewritten apps/web primarily in typeface. The user wants the two apps to read as one product: Outfit sans, hierarchy via lightness rather than weight, slightly rounded corners, restrained borders.

## Requirements

- **R1**: apps/docs renders body/heading text in Outfit and code in Geist Mono, with fontaine-style local fallbacks so layout shift stays minimal.
- **R2**: No Plex-specific metrics remain — the global `-0.015em` letter-spacing is removed (apps/web applies none for Outfit).
- **R3**: Existing docs features remain intact: math rendering (STIX Two Math), italics in prose, expressive-code blocks, search, tabs, callouts.
- **R4**: No regression to the shared token layers already aligned with apps/web (colors, radii, weights, link underlines).

## Key Technical Decisions

- **KTD1 — Reuse the exact font assets and fallback metrics from apps/web.** Copy `Outfit-VariableFont_wght.woff2` and `GeistMonoVF.woff2` from `apps/web/public/fonts/` into `apps/docs/src/assets/fonts/` (docs bundles fonts from `src/assets`, not `public/`), and port the `@font-face` blocks — including the capsize-derived `Outfit Fallback` / `Geist Mono Fallback` metrics — from `apps/web/src/styles/fonts.css`. Rationale: identical rendering, zero re-derivation of metrics.
- **KTD2 — Accept synthesized italics.** Outfit and Geist Mono ship no italic cuts (IBM Plex did, and docs prose uses `<em>`). Browsers will synthesize obliques; apps/web accepts the same trade-off. No `font-synthesis: none` exists in docs, so no change needed.
- **KTD3 — Keep the docs type scale and prose tokens.** The docs Utopia scale (`--step--1`…`--step-3`) is slightly smaller than web's, appropriate for long-form docs; the lightness-hierarchy tokens (`--prose-foreground`, `--muted-foreground`) already implement the "hierarchy using lightness" philosophy. Only the tracking token/application is removed.
- **KTD4 — Leave borders, radii, colors, and weights untouched.** They already match apps/web (verified: `apps/docs/src/styles/color.css`, `shape.css` mirror `apps/web/src/styles/color.css`, `shape.css`; both use `--font-weight-medium: 450` and 2px `var(--border)` surfaces).

---

## Implementation Units

### U1. Swap font assets and @font-face declarations

**Goal:** apps/docs loads Outfit + Geist Mono with matching local fallbacks.
**Requirements:** R1
**Dependencies:** none
**Files:** `apps/docs/src/assets/fonts/` (add Outfit + Geist Mono woff2, remove IBM Plex Sans/Mono woff2 files), `apps/docs/src/styles/fonts.css`
**Approach:** Replace all IBM Plex `@font-face` blocks (sans regular/italic/latin-ext, mono regular/italic/medium/medium-italic, and both fallback faces) with the four blocks from `apps/web/src/styles/fonts.css` (Outfit, Geist Mono, and their capsize fallbacks), adjusting `src: url()` to the docs relative-asset convention (`../assets/fonts/…`). Update `--font-sans` and `--font-mono`. Keep the STIX Two Math block and `--font-math` unchanged. Delete the now-unused Plex woff2 files.
**Patterns to follow:** `apps/web/src/styles/fonts.css` verbatim; docs asset-URL style in the existing `fonts.css`.
**Test scenarios:** Test expectation: none — pure asset/CSS swap; verified visually in U3.
**Verification:** `bun run build` (or the docs dev server) succeeds; no 404s for font files; computed `font-family` on body is Outfit.

### U2. Remove Plex-specific tracking

**Goal:** Typography metrics match apps/web's Outfit settings.
**Requirements:** R2
**Dependencies:** U1
**Files:** `apps/docs/src/styles/typography.css`, plus any other docs files referencing `--tracking-tight` (grep before editing).
**Approach:** Delete the `--tracking-tight` token and the universal `letter-spacing: var(--tracking-tight)` rule (apps/web's `typography.css` has no global tracking). Remove any stray `--tracking-tight` consumers found by grep.
**Test scenarios:** Test expectation: none — style-only change; verified visually in U3.
**Verification:** `rg tracking-tight apps/docs` returns nothing; body text renders without negative tracking.

### U3. Visual smoke pass across docs surfaces

**Goal:** Confirm R3/R4 — the retheme doesn't break any docs component in either color scheme.
**Requirements:** R3, R4
**Dependencies:** U1, U2
**Files:** none (verification unit)
**Approach:** Run the docs dev server and review representative pages: prose with italics/inline code, math, code blocks (expressive-code), tables, callouts, tabs, file trees, steps, cards, search, table of contents — in light and dark. Check that Outfit's synthesized italics look acceptable and that headings still get hierarchy from lightness/size, not weight.
**Execution note:** This is styling work; prefer runtime/visual smoke verification over unit coverage.
**Test scenarios:** Test expectation: none — visual verification unit.
**Verification:** No layout breakage or fallback-font flashes; both themes render correctly.

---

## Scope Boundaries

**In scope:** font swap, tracking removal, visual verification.

**Out of scope (already aligned, verified during planning):** color tokens, radius tokens, font weights, border treatment, link underlines — these mirror apps/web already.

### Deferred to Follow-Up Work

- Adopting apps/web's `--background-l0…l5` / `--foreground-l0…l5` ladder naming in docs (docs' `--muted`/`--muted-foreground`/`--prose-foreground` tokens achieve the same lightness hierarchy; renaming is churn without visual payoff).
- Matching apps/web's slightly larger type scale (docs' smaller long-form scale is intentional).

## Risks

- **Synthesized italics** may look weaker than Plex's true italics in prose-heavy pages. Mitigation: accepted trade-off (KTD2), consistent with apps/web; revisit only if U3 shows it reads badly.
- **Removed tracking changes line lengths** slightly; long headings may rewrap. `text-wrap: balance/pretty` already handles this.

## Verification Contract

- Docs build passes.
- `rg -i "plex" apps/docs/src` returns no font references.
- Visual smoke pass (U3) complete in both themes.

## Definition of Done

All three units complete; docs renders in Outfit/Geist Mono with no Plex assets shipped, no global tracking, and no visual regressions across docs components in light and dark modes.
