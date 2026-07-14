---
title: Theming and styling
description: How rCTF's color system, challenge categories, and UI components fit together.
order: 7
scroll: true
---

rCTF builds its light and dark themes from Radix Colors. Each challenge category has its own icon and hue. The interface uses Svelte components with scoped CSS, while Zag.js handles state for interactive controls such as dialogs and menus.

::::card-grid
:::card[Color system]{href=/theming/colors}
See how rCTF builds its light and dark themes from Radix Colors and assigns tokens to common interface roles.
:::

:::card[Categories]{href=/theming/categories}
See how category names, icons, colors, aliases, and ordering are defined, then add a category of your own.
:::

:::card[Components]{href=/theming/components}
Learn how the reusable Svelte components handle styling, variants, and interactive state.
:::
::::
