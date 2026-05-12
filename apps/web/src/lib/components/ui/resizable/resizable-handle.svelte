<script lang="ts">
  import { IconGripVertical } from '$lib/icons'
  import { cn, type WithoutChildrenOrChild } from '$lib/utils'
  import * as ResizablePrimitive from 'paneforge'

  let {
    ref = $bindable(null),
    class: className,
    withHandle = false,
    ...restProps
  }: WithoutChildrenOrChild<ResizablePrimitive.PaneResizerProps> & {
    withHandle?: boolean
  } = $props()
</script>

<ResizablePrimitive.PaneResizer
  bind:ref
  data-slot="resizable-handle"
  class={cn(
    'focus-visible:ring-ring relative flex w-px items-center justify-center bg-transparent after:absolute after:inset-y-0 after:inset-s-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[direction=vertical]:h-px data-[direction=vertical]:w-full data-[direction=vertical]:after:inset-s-0 data-[direction=vertical]:after:h-1 data-[direction=vertical]:after:w-full data-[direction=vertical]:after:translate-x-0 data-[direction=vertical]:after:-translate-y-1/2 [&[data-direction=vertical]>div]:rotate-90',
    className
  )}
  {...restProps}
>
  {#if withHandle}
    <div class="bg-background-l3 z-10 flex h-4 w-3 items-center justify-center rounded-sm border">
      <IconGripVertical class="text-foreground-l3 size-2.5" />
    </div>
  {/if}
</ResizablePrimitive.PaneResizer>
