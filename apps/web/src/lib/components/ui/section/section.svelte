<script lang="ts">
  import { cn } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let {
    class: className,
    children,
    ...restProps
  }: HTMLAttributes<HTMLDivElement> = $props()
</script>

<div
  data-slot="section"
  class={cn('overflow-hidden rounded-lg border-2', className)}
  {...restProps}
>
  {@render children?.()}
</div>
