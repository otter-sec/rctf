<script lang="ts">
  import { IconChevronUp } from '$lib/icons'
  import { cn, type WithoutChildrenOrChild } from '$lib/utils'
  import { Select as SelectPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SelectPrimitive.ScrollUpButtonProps> = $props()
</script>

<SelectPrimitive.ScrollUpButton
  bind:ref
  data-slot="select-scroll-up-button"
  class={cn('flex cursor-default items-center justify-center py-1', className)}
  {...restProps}>
  <IconChevronUp class="size-4" />
</SelectPrimitive.ScrollUpButton>
