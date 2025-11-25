<script lang="ts">
  import { IconArrowRight } from '$lib/icons'
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
  <IconArrowRight class="size-4" />
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
  children={children || Fallback}
  {...restProps}
/>
