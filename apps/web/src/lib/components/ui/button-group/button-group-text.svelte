<script lang="ts">
  import { cn, type WithElementRef } from '$lib/utils.js'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  let {
    ref = $bindable(null),
    class: className,
    child,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    child?: Snippet<[{ props: Record<string, unknown> }]>
  } = $props()

  const mergedProps = $derived({
    ...restProps,
    class: cn(
      "bg-background-l2 flex items-center gap-2 rounded-md border px-4 text-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
      className
    ),
  })
</script>

{#if child}
  {@render child({ props: mergedProps })}
{:else}
  <div bind:this={ref} {...mergedProps}>
    {@render mergedProps.children?.()}
  </div>
{/if}
