<script lang="ts">
  import { buttonVariants } from '$lib/components/ui/button/index.js'
  import Icon from '@iconify/svelte'
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
  <Icon icon="tabler:arrow-big-left-filled" class="size-4" />
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
