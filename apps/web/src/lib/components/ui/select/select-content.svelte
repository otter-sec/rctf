<script lang="ts">
  import { cn, type WithoutChild } from '$lib/utils'
  import { Select as SelectPrimitive } from 'bits-ui'
  import SelectScrollDownButton from './select-scroll-down-button.svelte'
  import SelectScrollUpButton from './select-scroll-up-button.svelte'

  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 4,
    portalProps,
    children,
    preventScroll = true,
    ...restProps
  }: WithoutChild<SelectPrimitive.ContentProps> & {
    portalProps?: SelectPrimitive.PortalProps
  } = $props()
</script>

<SelectPrimitive.Portal {...portalProps}>
  <SelectPrimitive.Content
    bind:ref
    {sideOffset}
    {preventScroll}
    data-slot="select-content"
    class={cn(
      'bg-background-l4 text-foreground-l0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--bits-select-content-available-height) min-w-32 origin-(--bits-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md shadow-md data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
      className,
      'border-background-l5 border-2'
    )}
    {...restProps}
  >
    <SelectScrollUpButton />
    <SelectPrimitive.Viewport
      class={cn(
        'h-(--bits-select-anchor-height) w-full min-w-(--bits-select-anchor-width) scroll-my-1 p-1'
      )}
    >
      {@render children?.()}
    </SelectPrimitive.Viewport>
    <SelectScrollDownButton />
  </SelectPrimitive.Content>
</SelectPrimitive.Portal>
