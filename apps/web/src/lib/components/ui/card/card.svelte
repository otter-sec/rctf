<script lang="ts">
  import { cn, type WithElementRef } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props()
</script>

<div
  bind:this={ref}
  data-slot="card"
  class={cn(
    'bg-background-l1 text-foreground-l0 flex flex-col gap-4 rounded-lg py-4 w-full max-w-3xl mx-auto',
    className
  )}
  {...restProps}>
  {@render children?.()}
</div>
