<script lang="ts">
  import { IconX } from '$lib/icons'
  import { cn, type WithElementRef } from '$lib/utils'
  import { Dialog as DialogPrimitive } from 'bits-ui'
  import type { HTMLAttributes } from 'svelte/elements'
  import { getDialogContext } from './dialog-content.svelte'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props()

  const { showCloseButton } = getDialogContext()
</script>

<div
  bind:this={ref}
  data-slot="dialog-header"
  class={cn('flex items-start justify-between gap-4 text-center sm:text-start', className)}
  {...restProps}
>
  <div class="flex flex-col gap-2">
    {@render children?.()}
  </div>
  {#if showCloseButton}
    <DialogPrimitive.Close
      class="focus:ring-ring focus:ring-offset-background-l1 -m-1 rounded-sm p-1 opacity-70 hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
    >
      <IconX />
      <span class="sr-only">Close</span>
    </DialogPrimitive.Close>
  {/if}
</div>
