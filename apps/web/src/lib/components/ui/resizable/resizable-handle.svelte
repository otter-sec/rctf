<script lang="ts">
  import IconGripVertical from '~icons/tabler/grip-vertical'
  import { cn, type WithoutChildrenOrChild } from '$lib/utils.js'
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
    'bg-transparent focus-visible:ring-ring focus-visible:outline-hidden relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:start-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 data-[direction=vertical]:h-px data-[direction=vertical]:w-full data-[direction=vertical]:after:start-0 data-[direction=vertical]:after:h-1 data-[direction=vertical]:after:w-full data-[direction=vertical]:after:-translate-y-1/2 data-[direction=vertical]:after:translate-x-0 [&[data-direction=vertical]>div]:rotate-90',
    className
  )}
  {...restProps}
>
  {#if withHandle}
    <div
      class="bg-background-l3 rounded-sm z-10 flex h-4 w-3 items-center justify-center border"
    >
      <IconGripVertical class="size-2.5 text-foreground-l3" />
    </div>
  {/if}
</ResizablePrimitive.PaneResizer>
