<script lang="ts">
  import { cn } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let { class: className, children, ...restProps }: HTMLAttributes<HTMLDivElement> = $props()
</script>

<div data-slot="section-content" class={cn('p-4', className)} {...restProps}>
  {@render children?.()}
</div>
