<script lang="ts">
  import { cn } from '$lib/utils'
  import { Drawer as DrawerPrimitive } from 'vaul-svelte'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DrawerPrimitive.DescriptionProps = $props()
</script>

<DrawerPrimitive.Description
  bind:ref
  data-slot="drawer-description"
  class={cn('text-foreground-l3 text-sm', className)}
  {...restProps}
/>
