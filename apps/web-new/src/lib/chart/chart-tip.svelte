<!--
  Positioned HTML tooltip shared by the profile bar/segment charts. Renders
  the `chart-tip` container at the pointer's last hit position, flipping to
  the other side of the chart's midpoint so it never covers the hovered
  element. Callers own the tooltip content via the `children` snippet.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    x: number
    y: number
    flip: boolean
    /** Widens the tooltip for content that can run long (e.g. category names). */
    wide?: boolean
    categoryColor?: string
    children: Snippet
  }

  let { x, y, flip, wide = false, categoryColor, children }: Props = $props()
</script>

<chart-tip
  data-flip={flip || undefined}
  data-wide={wide || undefined}
  data-category-color={categoryColor}
  style="--tip-x: {x}px; --tip-y: {y}px"
>
  {@render children()}
</chart-tip>

<style>
  chart-tip {
    position: absolute;
    inset-block-start: var(--tip-y);
    inset-inline-start: var(--tip-x);
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: var(--space-2xs) var(--space-xs);
    font-size: var(--step--1);
    background: var(--background-l4);
    border: 1px solid var(--background-l5);
    border-radius: var(--radius-md);
    pointer-events: none;
    transform: translate(0.75rem, -50%);

    &[data-wide] {
      max-inline-size: 16rem;
    }

    &[data-flip] {
      transform: translate(calc(-100% - 0.75rem), -50%);
    }
  }
</style>
