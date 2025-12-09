<script lang="ts">
  import { IconChevronRight } from '$lib/icons'
  import { cn } from '$lib/utils'
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    inset,
    children,
    ...restProps
  }: DropdownMenuPrimitive.SubTriggerProps & {
    inset?: boolean
  } = $props()
</script>

<DropdownMenuPrimitive.SubTrigger
  bind:ref
  data-slot="dropdown-menu-sub-trigger"
  data-inset={inset}
  class={cn(
    "data-highlighted:bg-background-l2 data-highlighted:text-foreground-l0 data-[state=open]:bg-background-l2 data-[state=open]:text-foreground-l0 outline-hidden [&_svg:not([class*='text-'])]:text-foreground-l3 flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-disabled:pointer-events-none data-inset:ps-8 data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    className
  )}
  {...restProps}
>
  {@render children?.()}
  <IconChevronRight class="ms-auto size-4" />
</DropdownMenuPrimitive.SubTrigger>
