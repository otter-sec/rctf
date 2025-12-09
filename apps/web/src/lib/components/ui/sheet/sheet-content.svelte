<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants'

  export const sheetVariants = tv({
    base: 'bg-background-l1 data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
    variants: {
      side: {
        top: 'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
        bottom:
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
        left: 'data-[state=closed]:slide-out-to-start data-[state=open]:slide-in-from-start inset-y-0 start-0 h-full w-3/4 border-e sm:max-w-sm',
        right:
          'data-[state=closed]:slide-out-to-end data-[state=open]:slide-in-from-end inset-y-0 end-0 h-full w-3/4 border-s sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  })

  export type Side = VariantProps<typeof sheetVariants>['side']
</script>

<script lang="ts">
  import { IconX } from '$lib/icons'
  import { cn, type WithoutChildrenOrChild } from '$lib/utils.js'
  import { Dialog as SheetPrimitive } from 'bits-ui'
  import type { ComponentProps, Snippet } from 'svelte'
  import Button from '../button/button.svelte'
  import SheetOverlay from './sheet-overlay.svelte'
  import SheetPortal from './sheet-portal.svelte'

  let {
    ref = $bindable(null),
    class: className,
    side = 'right',
    portalProps,
    children,
    ...restProps
  }: WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof SheetPortal>>
    side?: Side
    children: Snippet
  } = $props()
</script>

<SheetPortal {...portalProps}>
  <SheetOverlay />
  <SheetPrimitive.Content
    bind:ref
    data-slot="sheet-content"
    class={cn(sheetVariants({ side }), className)}
    {...restProps}>
    {@render children?.()}
  </SheetPrimitive.Content>
</SheetPortal>
