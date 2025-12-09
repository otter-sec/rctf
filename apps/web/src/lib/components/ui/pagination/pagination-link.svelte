<script lang="ts">
  import { buttonVariants, type Props } from '$lib/components/ui/button/index.js'
  import { cn } from '$lib/utils'
  import { Pagination as PaginationPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    size = 'icon',
    isActive,
    page,
    children,
    ...restProps
  }: PaginationPrimitive.PageProps &
    Props & {
      isActive: boolean
    } = $props()
</script>

{#snippet Fallback()}
  {page.value}
{/snippet}

<PaginationPrimitive.Page
  bind:ref
  {page}
  aria-current={isActive ? 'page' : undefined}
  data-slot="pagination-link"
  data-active={isActive}
  class={cn(
    buttonVariants({
      variant: 'ghost',
      size,
    }),
    isActive &&
      'bg-foreground-l0 text-background-l0 hover:bg-foreground-l1 hover:text-background-l0',
    className
  )}
  {...restProps}
>
  {@render (children ?? Fallback)()}
</PaginationPrimitive.Page>
