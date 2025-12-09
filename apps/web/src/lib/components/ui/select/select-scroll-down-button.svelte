<script lang="ts">
  import { IconChevronDown } from '$lib/icons'
  import { cn, type WithoutChildrenOrChild } from '$lib/utils'
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
  <IconChevronDown class="size-4" />
</SelectPrimitive.ScrollDownButton>
