<script lang="ts">
  import { IconCheck, IconMinus } from '$lib/icons'
  import { cn, type WithoutChildrenOrChild } from '$lib/utils'
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  let {
    ref = $bindable(null),
    checked = $bindable(false),
    indeterminate = $bindable(false),
    class: className,
    children: childrenProp,
    ...restProps
  }: WithoutChildrenOrChild<DropdownMenuPrimitive.CheckboxItemProps> & {
    children?: Snippet
  } = $props()
</script>

<DropdownMenuPrimitive.CheckboxItem
  bind:ref
  bind:checked
  bind:indeterminate
  data-slot="dropdown-menu-checkbox-item"
  class={cn(
    "focus:bg-background-l2 focus:text-foreground-l0 relative flex cursor-default items-center gap-2 rounded-sm py-1.5 ps-8 pe-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
>
  {#snippet children({ checked, indeterminate })}
    <span
      class={cn(
        'border-foreground-l4/60 pointer-events-none absolute inset-s-2 flex size-4 items-center justify-center rounded-lg border-2',
        checked && 'bg-foreground-l0 text-background-l0 border-foreground-l0'
      )}
    >
      {#if indeterminate}
        <IconMinus class="size-3" />
      {:else if checked}
        <IconCheck class="size-3" />
      {/if}
    </span>
    {@render childrenProp?.()}
  {/snippet}
</DropdownMenuPrimitive.CheckboxItem>
