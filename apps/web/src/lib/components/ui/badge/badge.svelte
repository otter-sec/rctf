<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants'

  export const badgeVariants = tv({
    base: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-foreground-destructive/20 aria-invalid:border-foreground-destructive inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3',
    variants: {
      variant: {
        default:
          'bg-background-accent text-foreground-accent [a&]:hover:bg-background-accent/90 border-transparent',
        secondary:
          'bg-background-l2 text-foreground-l1 [a&]:hover:bg-background-l2/90 border-transparent',
        destructive:
          'bg-background-destructive text-foreground-destructive [a&]:hover:bg-background-destructive/90 focus-visible:ring-foreground-destructive/20 border-transparent',
        outline: 'text-foreground-l1 [a&]:hover:bg-background-l2',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  })

  export type BadgeVariant = VariantProps<typeof badgeVariants>['variant']
</script>

<script lang="ts">
  import { cn, type WithElementRef } from '$lib/utils.js'
  import type { HTMLAnchorAttributes } from 'svelte/elements'

  let {
    ref = $bindable(null),
    href,
    class: className,
    variant = 'default',
    children,
    ...restProps
  }: WithElementRef<HTMLAnchorAttributes> & {
    variant?: BadgeVariant
  } = $props()
</script>

<svelte:element
  this={href ? 'a' : 'span'}
  bind:this={ref}
  data-slot="badge"
  {href}
  class={cn(badgeVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</svelte:element>
