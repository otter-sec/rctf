<script lang="ts">
  import { CollapseToggleButton, SearchInput, Tooltip } from '$lib/components'
  import { IconEyeClosed, IconEyeFilled } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    pointsEarned: number
    pointsTotal: number
    solved: number
    total: number
    searchQuery: string
    hideSolved: boolean
    categoryCount: number
    openCategoryCount: number
    onSearchChange: (query: string) => void
    onToggleHideSolved: () => void
    onToggleCollapse: () => void
  }

  let {
    pointsEarned,
    pointsTotal,
    solved,
    total,
    searchQuery,
    hideSolved,
    categoryCount,
    openCategoryCount,
    onSearchChange,
    onToggleHideSolved,
    onToggleCollapse,
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
    <div class="flex flex-wrap gap-1">
      <SearchInput
        value={searchQuery}
        onInput={onSearchChange}
        class="min-w-0 flex-1 rounded-[20px] py-2 @sm/list:rounded-l-[20px] @sm/list:rounded-r-sm"
      />
      <div class="flex w-full gap-1 @sm/list:w-auto">
        <Tooltip.Root disableCloseOnTriggerClick>
          <Tooltip.Trigger
            type="button"
            onclick={onToggleHideSolved}
            aria-label={hideSolved ? 'Show solved challenges' : 'Hide solved challenges'}
            class={cn(
              'focus-visible:ring-ring/50 flex h-10 flex-1 items-center justify-center rounded-l-[20px] rounded-r-sm px-4 py-2 outline-none focus-visible:ring-[3px] @sm/list:flex-initial @sm/list:rounded-sm',
              hideSolved
                ? 'bg-background-accent text-foreground-accent hover:bg-background-accent-hover'
                : 'bg-background-l4 text-foreground-l1 hover:bg-background-l5'
            )}
          >
            {#if hideSolved}
              <IconEyeClosed class="size-5 shrink-0" />
            {:else}
              <IconEyeFilled class="size-5 shrink-0" />
            {/if}
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            {hideSolved ? 'Show solved' : 'Hide solved'}
          </Tooltip.Content>
        </Tooltip.Root>
        <CollapseToggleButton
          totalCount={categoryCount}
          openCount={openCategoryCount}
          onToggle={onToggleCollapse}
          class="rounded-l-sm rounded-r-[20px]"
        />
      </div>
    </div>
  </div>
</div>
