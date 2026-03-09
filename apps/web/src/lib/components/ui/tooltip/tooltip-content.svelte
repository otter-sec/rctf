<script lang="ts">
  import { cn } from '$lib/utils'
  import { Tooltip as TooltipPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 0,
    side = 'top',
    children,
    arrowClasses,
    ...restProps
  }: TooltipPrimitive.ContentProps & {
    arrowClasses?: string
  } = $props()
</script>

<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content
    bind:ref
    data-slot="tooltip-content"
    {sideOffset}
    {side}
    class={cn(
      'bg-background-l4 text-foreground-l0 shadow-[0_4px_16px_rgba(0,0,0,0.2)] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--bits-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs font-medium text-balance',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
    <TooltipPrimitive.Arrow>
      {#snippet child({ props })}
        <div
          class={cn(
            'bg-background-l4 z-50 size-2.5 rotate-45 rounded-[2px]',
            'data-[side=top]:translate-x-[calc(50%+2px)] data-[side=top]:translate-y-[calc(-50%+2px)]',
            'data-[side=bottom]:-translate-x-[calc(50%-1px)] data-[side=bottom]:-translate-y-[calc(-50%+1px)]',
            'data-[side=right]:translate-x-[calc(50%+2px)] data-[side=right]:translate-y-1/2',
            'data-[side=left]:-translate-y-[calc(50%-3px)]',
            arrowClasses
          )}
          {...props}
        ></div>
      {/snippet}
    </TooltipPrimitive.Arrow>
  </TooltipPrimitive.Content>
</TooltipPrimitive.Portal>
