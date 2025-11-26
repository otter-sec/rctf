<script lang="ts">
  import Icon from '@iconify/svelte'
  import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils.js'
  import type { HTMLAttributes } from 'svelte/elements'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChildren<WithElementRef<HTMLAttributes<HTMLSpanElement>>> = $props()
</script>

<span
  bind:this={ref}
  aria-hidden="true"
  data-slot="pagination-ellipsis"
  class={cn('flex size-9 items-center justify-center', className)}
  {...restProps}
>
  <Icon icon="tabler:dots" class="size-4" />
  <span class="sr-only">More pages</span>
</span>
