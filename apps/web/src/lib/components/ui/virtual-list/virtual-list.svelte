<script lang="ts" generics="T">
  import type { Snippet } from 'svelte'
  import type { VirtualItem } from '@tanstack/svelte-virtual'
  import { cn } from '$lib/utils'
  import { Spinner } from '../spinner'

  interface Props {
    virtualItems: VirtualItem[]
    totalSize: number
    items: T[]
    hasNextPage?: boolean
    scrollMargin?: number
    class?: string
    itemClass?: string
    children: Snippet<[{ item: T; index: number; virtualItem: VirtualItem }]>
    loading?: Snippet
  }

  let {
    virtualItems,
    totalSize,
    items,
    hasNextPage = false,
    scrollMargin = 0,
    class: className,
    itemClass,
    children,
    loading,
  }: Props = $props()
</script>

<div
  class={cn('relative contain-[layout_style] backface-hidden', className)}
  style="height: {totalSize}px;"
>
  {#each virtualItems as row (row.index)}
    {#if row.index > items.length - 1}
      <div
        class="absolute top-0 left-0 flex w-full items-center justify-center"
        style="height: {row.size}px; transform: translate3d(0, {row.start - scrollMargin}px, 0);"
      >
        {#if hasNextPage}
          {#if loading}
            {@render loading()}
          {:else}
            <Spinner class="text-foreground-l3 size-5" />
          {/if}
        {/if}
      </div>
    {:else if items[row.index] !== undefined}
      <div
        class={cn(
          'absolute top-0 left-0 w-full will-change-transform contain-[layout_style_paint]',
          itemClass
        )}
        style="height: {row.size}px; transform: translate3d(0, {row.start - scrollMargin}px, 0);"
      >
        {@render children({ item: items[row.index]!, index: row.index, virtualItem: row })}
      </div>
    {/if}
  {/each}
</div>
