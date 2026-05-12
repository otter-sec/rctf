<script lang="ts" module>
  import { getContext, setContext } from 'svelte'

  const DIALOG_CONTEXT_KEY = Symbol('dialog-context')

  interface DialogContext {
    readonly showCloseButton: boolean
  }

  export function getDialogContext(): DialogContext {
    return getContext(DIALOG_CONTEXT_KEY)
  }

  function setDialogContext(context: DialogContext) {
    setContext(DIALOG_CONTEXT_KEY, context)
  }
</script>

<script lang="ts">
  import { cn, type WithoutChildrenOrChild } from '$lib/utils'
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

  setDialogContext({
    get showCloseButton() {
      return showCloseButton
    },
  })
</script>

<Dialog.Portal {...portalProps}>
  <Dialog.Overlay />
  <DialogPrimitive.Content
    bind:ref
    data-slot="dialog-content"
    class={cn(
      'bg-background-l1 text-foreground-l0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed inset-s-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
  </DialogPrimitive.Content>
</Dialog.Portal>
