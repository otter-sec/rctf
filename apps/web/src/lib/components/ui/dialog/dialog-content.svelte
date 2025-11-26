<script lang="ts">
  import { IconX } from '$lib/icons'
  import { cn, type WithoutChildrenOrChild } from '$lib/utils.js'
  import { Dialog as DialogPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import * as Dialog from './index.js'

  let {
    ref = $bindable(null),
    class: className,
    portalProps,
    children,
    showCloseButton = true,
    ...restProps
  }: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
    portalProps?: DialogPrimitive.PortalProps
    children: Snippet
    showCloseButton?: boolean
  } = $props()
</script>

<Dialog.Portal {...portalProps}>
  <Dialog.Overlay />
  <DialogPrimitive.Content
    bind:ref
    data-slot="dialog-content"
    class={cn(
      'bg-background-l1 text-foreground-l0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed start-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
    {#if showCloseButton}
      <DialogPrimitive.Close
        class="focus:ring-ring rounded-xs focus:outline-hidden absolute end-4 top-4 opacity-70 hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-l1 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
      >
        <IconX />
        <span class="sr-only">Close</span>
      </DialogPrimitive.Close>
    {/if}
  </DialogPrimitive.Content>
</Dialog.Portal>
