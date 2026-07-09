---
title: Theming and styling
description: How rCTF's color system, challenge categories, and UI components fit together.
order: 7
scroll: true
---

rCTF uses Radix Colors for its light and dark palettes, with a separate icon and hue assigned to each challenge category. The interface itself is built from Svelte components and scoped CSS, with Zag.js state machines handling the more interactive controls.

::::card-grid
:::card[Color system]{href=/theming/colors}
Radix-based color tokens, layered grays, and light and dark themes out of the box.
:::

:::card[Categories]{href=/theming/categories}
Category colors, icons, and display names, plus how to add your own.
:::

:::card[Components]{href=/theming/components}
The Zag.js and scoped-CSS component library, and how to add to it.
:::
::::
