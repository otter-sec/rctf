<script lang="ts">
  import { cn } from '$lib/utils'
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    inset,
    variant = 'default',
    ...restProps
  }: DropdownMenuPrimitive.ItemProps & {
    inset?: boolean
    variant?: 'default' | 'destructive'
  } = $props()
</script>

<DropdownMenuPrimitive.Item
  bind:ref
  data-slot="dropdown-menu-item"
  data-inset={inset}
  data-variant={variant}
  class={cn(
    "data-highlighted:bg-background-l2 data-highlighted:text-foreground-l0 data-[variant=destructive]:text-foreground-destructive data-[variant=destructive]:data-highlighted:bg-background-destructive data-[variant=destructive]:data-highlighted:text-foreground-destructive data-[variant=destructive]:*:[svg]:text-foreground-destructive! [&_svg:not([class*='text-'])]:text-foreground-l3 relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
/>
