<script lang="ts">
  import ArrowLeft from '@iconify-svelte/tabler/arrow-big-left-filled'
  import { buttonVariants } from '$lib/components/ui/button/index.js'
  import { cn } from '$lib/utils.js'
  import { Pagination as PaginationPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: PaginationPrimitive.PrevButtonProps = $props()
</script>

{#snippet Fallback()}
  <ArrowLeft class="size-4" />
  <span>Previous</span>
{/snippet}

<PaginationPrimitive.PrevButton
  bind:ref
  aria-label="Go to previous page"
  class={cn(
    buttonVariants({
      size: 'default',
      variant: 'ghost',
      class: 'gap-2 px-2.5 sm:ps-2.5',
    }),
    className
  )}
  children={children || Fallback}
  {...restProps}
/>
