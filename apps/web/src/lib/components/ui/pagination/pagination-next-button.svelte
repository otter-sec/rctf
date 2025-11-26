<script lang="ts">
  import IconArrowBigRightFilled from '~icons/tabler/arrow-big-right-filled'
  import { buttonVariants } from '$lib/components/ui/button/index.js'
  import { cn } from '$lib/utils.js'
  import { Pagination as PaginationPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: PaginationPrimitive.NextButtonProps = $props()
</script>

{#snippet Fallback()}
  <span>Next</span>
  <IconArrowBigRightFilled class="size-4" />
{/snippet}

<PaginationPrimitive.NextButton
  bind:ref
  aria-label="Go to next page"
  class={cn(
    buttonVariants({
      size: 'default',
      variant: 'ghost',
      class: 'gap-2 px-2.5 sm:pe-2.5',
    }),
    className
  )}
  {...restProps}
>
  {@render (children ?? Fallback)()}
</PaginationPrimitive.NextButton>
