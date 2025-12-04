<script lang="ts">
  import { cn } from '$lib/utils'
  import type { HTMLAttributes } from 'svelte/elements'

  let {
    class: className,
    children,
    ...restProps
  }: HTMLAttributes<HTMLSpanElement> = $props()
</script>

<span
  data-slot="field-hint"
  class={cn('text-foreground-l4 font-normal', className)}
  {...restProps}
>
  {@render children?.()}
</span>
