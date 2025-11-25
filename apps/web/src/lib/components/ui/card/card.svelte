<script lang="ts">
  import { cn, type WithElementRef } from '$lib/utils.js'
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
    'bg-background-l1 text-foreground-l0 flex flex-col gap-4 rounded-lg border py-4 shadow-sm',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
