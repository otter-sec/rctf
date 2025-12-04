<script lang="ts">
  import { cn } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let { class: className, children, ...restProps }: HTMLAttributes<HTMLDivElement> = $props()
</script>

<div
  data-slot="section-header"
  class={cn('bg-background-l3 px-4 py-1.5 text-base text-foreground-l3', className)}
  {...restProps}>
  {@render children?.()}
</div>
