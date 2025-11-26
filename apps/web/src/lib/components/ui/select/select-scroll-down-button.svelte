<script lang="ts">
  import Icon from '@iconify/svelte'
  import { cn, type WithoutChildrenOrChild } from '$lib/utils.js'
  import { Select as SelectPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SelectPrimitive.ScrollDownButtonProps> = $props()
</script>

<SelectPrimitive.ScrollDownButton
  bind:ref
  data-slot="select-scroll-down-button"
  class={cn('flex cursor-default items-center justify-center py-1', className)}
  {...restProps}
>
  <Icon icon="tabler:chevron-down" class="size-4" />
</SelectPrimitive.ScrollDownButton>
