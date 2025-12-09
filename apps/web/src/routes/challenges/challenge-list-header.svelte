<script lang="ts">
  import { SearchInput, Tooltip } from '$lib/components'
  import { IconEyeClosed, IconEyeFilled, IconFold } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    pointsEarned: number
    pointsTotal: number
    solved: number
    total: number
    searchQuery: string
    hideSolved: boolean
    onSearchChange: (query: string) => void
    onToggleHideSolved: () => void
    onCollapseAll: () => void
  }

  let {
    pointsEarned,
    pointsTotal,
    solved,
    total,
    searchQuery,
    hideSolved,
    onSearchChange,
    onToggleHideSolved,
    onCollapseAll,
  }: Props = $props()
</script>

<div class="flex shrink-0 flex-col gap-2 py-2">
  <div class="flex justify-between px-9">
    <div class="flex gap-1 whitespace-nowrap">
      <span class="text-foreground-l3 text-base tabular-nums">
        {pointsEarned.toLocaleString()}
      </span>
      <span class="text-foreground-l5 text-base">
        / {pointsTotal.toLocaleString()} pts
      </span>
    </div>
    <div class="flex items-baseline gap-1 whitespace-nowrap">
      <span class="text-foreground-l3 text-base tabular-nums">
        {solved}
      </span>
      <span class="text-foreground-l5 text-base">
        / {total}
      </span>
    </div>
  </div>

  <div class="px-5">
    <div class="flex flex-wrap gap-1 @sm/list:rounded-full @sm/list:overflow-hidden">
      <SearchInput
        value={searchQuery}
        onInput={onSearchChange}
        class="min-w-0 flex-1 py-2 rounded-full @sm/list:rounded-r-sm @sm/list:rounded-l-none" />
      <div
        class="flex w-full gap-1 @sm/list:w-auto rounded-full @sm/list:rounded-none overflow-hidden @sm/list:overflow-auto">
        <Tooltip.Root disableCloseOnTriggerClick>
          <Tooltip.Trigger
            onclick={onToggleHideSolved}
            aria-label={hideSolved ? 'Show solved challenges' : 'Hide solved challenges'}
            class={cn(
              'flex flex-1 items-center justify-center px-4 py-2 @sm/list:flex-initial rounded-sm',
              hideSolved
                ? 'bg-background-accent text-foreground-accent hover:bg-background-accent-hover'
                : 'bg-background-l4 text-foreground-l1 hover:bg-background-l5'
            )}>
            {#if hideSolved}
              <IconEyeClosed class="size-5" />
            {:else}
              <IconEyeFilled class="size-5" />
            {/if}
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            {hideSolved ? 'Show solved' : 'Hide solved'}
          </Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root disableCloseOnTriggerClick>
          <Tooltip.Trigger
            onclick={onCollapseAll}
            aria-label="Collapse all"
            class="flex flex-1 items-center justify-center bg-background-l4 px-4 py-2 text-foreground-l1 hover:bg-background-l5 @sm/list:flex-initial rounded-sm">
            <IconFold class="size-5" />
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>Collapse all</Tooltip.Content>
        </Tooltip.Root>
      </div>
    </div>
  </div>
</div>
