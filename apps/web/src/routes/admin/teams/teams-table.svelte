<script lang="ts">
  import { AdminTeamSortBy, SortOrder } from '@rctf/types'
  import { EmptyState, ScrollArea, VirtualList } from '$lib/components'
  import { IconChevronDown, IconChevronUp, IconSelector, IconUsersGroup } from '$lib/icons'
  import { useInfiniteVirtualScroll } from '$lib/utils'
  import TeamTableRow from './team-table-row.svelte'
  import TeamsFilterBar from './teams-filter-bar.svelte'
  import {
    defaultSortOrder,
    hasTeamFilters,
    ROW_HEIGHT,
    type DivisionFilterOption,
    type SortBy,
    type TeamFilters,
    type TeamRow,
  } from './teams-model'

  type ClientConfig = {
    divisions: Record<string, string>
    startTime?: number | null
  }

  interface Props {
    rows: TeamRow[]
    resetKey: string
    filters: TeamFilters
    sortBy: SortBy
    sortOrder: SortOrder
    clientConfig?: ClientConfig
    divisionOptions: DivisionFilterOption[]
    shouldFetchRegisteredRows: boolean
    hasNextPage: boolean
    isFetching: boolean
    isFetchingNextPage: boolean
    hasWritePerms: boolean
    hasTeamDetailsPerms: boolean
    copyingTeamId: string | null
    updatingTeamId: string | null
    deletingTeamId: string | null
    completingVerificationId: string | null
    resendingVerificationId: string | null
    onLoadMore: () => void
    onCopyEmail: (email: string) => void
    onCopyToken: (team: { id: string; name: string }) => void
    onManageTeam: (teamId: string) => void
    onBanAction: (team: { id: string; name: string; banned: boolean }) => void
    onDeleteTeam: (team: { id: string; name: string }) => void
    onCompleteVerification: (verification: { id: string; name: string }) => void
    onResendVerification: (verification: { id: string; name: string }) => void
  }

  let {
    rows,
    resetKey,
    filters = $bindable<TeamFilters>(),
    sortBy = $bindable<SortBy>(),
    sortOrder = $bindable<SortOrder>(),
    clientConfig,
    divisionOptions,
    shouldFetchRegisteredRows,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    hasWritePerms,
    hasTeamDetailsPerms,
    copyingTeamId,
    updatingTeamId,
    deletingTeamId,
    completingVerificationId,
    resendingVerificationId,
    onLoadMore,
    onCopyEmail,
    onCopyToken,
    onManageTeam,
    onBanAction,
    onDeleteTeam,
    onCompleteVerification,
    onResendVerification,
  }: Props = $props()

  let tableHeaderRef = $state<HTMLElement | null>(null)
  let listScrollMargin = $state(0)
  let tableViewportWidth = $state(0)
  let innerWidth = $state(0)

  const hasFilters = $derived(hasTeamFilters(filters))
  const hasNextRegisteredPage = $derived(shouldFetchRegisteredRows && hasNextPage)
  const pinnedToolbarWidth = $derived(tableViewportWidth ? `${tableViewportWidth}px` : '100%')
  const isMobileFilterMenu = $derived(innerWidth > 0 && innerWidth < 768)

  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 12,
    onLoadMore: () => onLoadMore(),
  })

  $effect(() => {
    scroll.state.count = rows.length + (hasNextRegisteredPage ? 1 : 0)
    scroll.state.hasNextPage = hasNextRegisteredPage
    scroll.state.isFetching = isFetchingNextPage
    scroll.state.scrollMargin = listScrollMargin
  })

  $effect(() => {
    const header = tableHeaderRef
    if (!header) {
      listScrollMargin = 0
      return
    }

    const resizeObserver = new ResizeObserver(entries => {
      listScrollMargin = Math.round(entries[0]?.contentRect.height ?? 0)
    })
    resizeObserver.observe(header)
    listScrollMargin = Math.round(header.getBoundingClientRect().height)

    return () => resizeObserver.disconnect()
  })

  $effect(() => {
    const viewport = scroll.state.viewportRef
    if (!viewport) {
      tableViewportWidth = 0
      return
    }

    const resizeObserver = new ResizeObserver(entries => {
      tableViewportWidth = Math.round(entries[0]?.contentRect.width ?? 0)
    })
    resizeObserver.observe(viewport)
    tableViewportWidth = Math.round(viewport.getBoundingClientRect().width)

    return () => resizeObserver.disconnect()
  })

  $effect(() => {
    resetKey
    const viewport = scroll.state.viewportRef
    if (viewport) viewport.scrollTop = 0
  })

  function setSort(nextSortBy: SortBy) {
    if (sortBy === nextSortBy) {
      sortOrder = sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC
      return
    }

    sortBy = nextSortBy
    sortOrder = defaultSortOrder(nextSortBy)
  }
</script>

{#snippet sortIndicator(column: SortBy)}
  {#if sortBy === column}
    {#if sortOrder === SortOrder.ASC}
      <IconChevronUp class="size-4" />
    {:else}
      <IconChevronDown class="size-4" />
    {/if}
  {:else}
    <IconSelector class="text-foreground-l4 size-4" />
  {/if}
{/snippet}

{#snippet sortHeader(column: SortBy, label: string)}
  <button
    type="button"
    class="hover:text-foreground-l0 flex w-full items-center gap-1 px-3 py-2 text-left whitespace-nowrap"
    onclick={() => setSort(column)}
  >
    <span class="truncate">{label}</span>
    {@render sortIndicator(column)}
  </button>
{/snippet}

{#snippet tableHeader()}
  <div
    class="bg-background-l3 text-foreground-l3 relative z-10 grid grid-cols-[minmax(18rem,1.3fr)_9rem_11rem_minmax(16rem,1fr)_8rem_7rem_15rem_12rem] border-b-2 text-base"
  >
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.TEAM, 'Team')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.STATUS, 'Status')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.DIVISION, 'Division')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.EMAIL, 'Email')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.SCORE, 'Score')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.SOLVES, 'Solves')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.CREATED_AT, 'Registered')}
    </div>
    <div class="px-3 py-2 font-normal">Actions</div>
  </div>
{/snippet}

<svelte:window bind:innerWidth />

<ScrollArea
  bind:viewportRef={scroll.state.viewportRef}
  class="bg-background-l1 h-full overflow-hidden rounded-lg border-2"
  orientation="both"
  type="always"
  fadeSize={48}
  fadeColor="background-l1"
  fadeOffsets={{ top: listScrollMargin }}
  scrollbarYClasses="z-40"
  scrollbarYStyles={`margin-top: ${listScrollMargin}px; height: calc(100% - ${listScrollMargin}px);`}
>
  <div class="min-h-full w-full min-w-[94rem] text-sm">
    <div class="flex min-h-full flex-col">
      <div bind:this={tableHeaderRef} class="bg-background-l1 sticky top-0 z-50">
        <TeamsFilterBar
          bind:filters
          {divisionOptions}
          {isFetching}
          isMobile={isMobileFilterMenu}
          {pinnedToolbarWidth}
        />
        {@render tableHeader()}
      </div>
      {#if rows.length === 0}
        <EmptyState
          icon={IconUsersGroup}
          title={hasFilters ? 'No matching teams' : 'No teams'}
          subtitle={hasFilters
            ? 'Adjust or clear the filters to broaden the team list.'
            : 'Teams will appear here after registration.'}
          class="min-h-80 flex-1"
        />
      {:else}
        <VirtualList
          virtualItems={scroll.virtualItems}
          totalSize={scroll.totalSize}
          items={rows}
          hasNextPage={hasNextRegisteredPage}
          scrollMargin={listScrollMargin}
        >
          {#snippet children({ item, index })}
            <TeamTableRow
              row={item}
              {index}
              {clientConfig}
              {hasWritePerms}
              {hasTeamDetailsPerms}
              {copyingTeamId}
              {updatingTeamId}
              {deletingTeamId}
              {completingVerificationId}
              {resendingVerificationId}
              {onCopyEmail}
              {onCopyToken}
              {onManageTeam}
              {onBanAction}
              {onDeleteTeam}
              {onCompleteVerification}
              {onResendVerification}
            />
          {/snippet}
        </VirtualList>
      {/if}
    </div>
  </div>
</ScrollArea>
