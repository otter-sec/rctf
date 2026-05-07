<script lang="ts">
  import { SubmissionSortBy, SubmissionSortOrder } from '@rctf/types'
  import { Card, EmptyState, ScrollArea, Spinner } from '$lib/components'
  import { IconClockFilled, IconTableFilled } from '$lib/icons'
  import {
    useAdminChallenges,
    useClientConfig,
    useInfiniteAdminSubmissions,
    useInfiniteAdminUsers,
  } from '$lib/query'
  import { formatCtfOffset, formatLocalTime, useInfiniteVirtualScroll } from '$lib/utils'
  import { createSubmissionValueFilterFamilies } from './filters/families'
  import SubmissionsFilterBar from './filters/filter-bar.svelte'
  import {
    normalizeSearchText,
    PAGE_SIZE,
    rootFilterFamilyMatchesSearch,
    rootSearchMatchesForFamily,
    ROW_HEIGHT,
    searchMatches,
    uniqueTeamOptions,
    type RootFilterOptionMatch,
    type TimeFilterFamily,
    type VirtualRow,
  } from './filters/ui'
  import {
    createSubmissionFilters,
    hasSubmissionFilters,
    resolveTimeRangeFilter,
    submissionFilterFingerprint,
    submissionFilterParams,
  } from './submissions-filters'
  import { type SortBy, type Submission } from './submissions-utils'
  import SubmissionDetailRow from './table/detail-row.svelte'
  import SubmissionsTableHeader from './table/header.svelte'
  import SubmissionTableRow from './table/row.svelte'

  let sortBy = $state<SortBy>(SubmissionSortBy.CREATED_AT)
  let sortOrder = $state<SubmissionSortOrder>(SubmissionSortOrder.DESC)
  let filters = $state(createSubmissionFilters())
  let rootFilterSearch = $state('')
  let expandedSubmissionId = $state<string | null>(null)
  let tableHeaderRef = $state<HTMLElement | null>(null)
  let listScrollMargin = $state(0)

  const trimmedRootFilterSearch = $derived(rootFilterSearch.trim())
  const normalizedRootFilterSearch = $derived(normalizeSearchText(trimmedRootFilterSearch))
  const isRootFilterSearchActive = $derived(normalizedRootFilterSearch.length > 0)
  const clientConfigQuery = useClientConfig()
  const challengesQuery = useAdminChallenges()
  const teamSuggestionsQuery = useInfiniteAdminUsers(
    () => 16,
    () => {
      const search = filters.team.search.trim()
      return search.length >= 2 ? search : undefined
    },
    () => true
  )
  const rootTeamSuggestionsQuery = useInfiniteAdminUsers(
    () => 16,
    () => trimmedRootFilterSearch || undefined,
    () => isRootFilterSearchActive
  )
  const clientConfig = $derived(clientConfigQuery.data)
  const trimmedChallengeSearch = $derived(filters.challenge.search.trim().toLowerCase())
  const hasFilters = $derived(hasSubmissionFilters(filters))
  const queryFingerprint = $derived(
    `${sortBy}:${sortOrder}:${submissionFilterFingerprint(filters)}`
  )
  const allChallengeOptions = $derived(
    (challengesQuery.data ?? []).map(challenge => ({
      id: challenge.id,
      name: challenge.name,
      category: challenge.category,
    }))
  )
  const challengeOptions = $derived(
    allChallengeOptions.filter(challenge => {
      if (!trimmedChallengeSearch) return true
      return searchMatches(trimmedChallengeSearch, challenge.name, challenge.category)
    })
  )
  const categoryOptions = $derived.by(() => {
    const categories = Array.from(
      new Set(
        (challengesQuery.data ?? []).map(challenge => challenge.category.trim()).filter(Boolean)
      )
    )

    return categories
      .sort((a, b) => a.localeCompare(b))
      .map(category => ({
        value: category,
        label: category,
      }))
  })
  const divisionOptions = $derived(
    Object.entries(clientConfig?.divisions ?? {}).map(([value, label]) => ({
      value,
      label,
    }))
  )
  const teamOptions = $derived.by(() =>
    uniqueTeamOptions([
      ...filters.team.selected,
      ...(teamSuggestionsQuery.data?.pages.flatMap(page => page.users) ?? []),
    ])
  )
  const rootTeamOptions = $derived.by(() =>
    uniqueTeamOptions([
      ...filters.team.selected,
      ...(rootTeamSuggestionsQuery.data?.pages.flatMap(page => page.users) ?? []),
    ])
  )

  const valueFilterFamilies = $derived.by(() =>
    createSubmissionValueFilterFamilies({
      filters,
      challengeOptions,
      allChallengeOptions,
      teamOptions,
      rootTeamOptions,
      categoryOptions,
      divisionOptions,
      challengesPending: () => challengesQuery.isPending,
      teamOptionsLoading: () => teamSuggestionsQuery.isFetching && teamOptions.length === 0,
    })
  )
  const timeFilterFamily = {
    id: 'time',
    label: 'Time',
    icon: IconClockFilled,
    searchTerms: ['date', 'range', 'ctf', 'relative'],
  } satisfies TimeFilterFamily
  const rootValueFilterFamilyMatches = $derived(
    valueFilterFamilies.filter(family =>
      rootFilterFamilyMatchesSearch(family, normalizedRootFilterSearch)
    )
  )
  const rootTimeFilterFamilyMatches = $derived(
    rootFilterFamilyMatchesSearch(timeFilterFamily, normalizedRootFilterSearch)
  )
  const rootFilterOptionMatches = $derived.by((): RootFilterOptionMatch[] => {
    if (!isRootFilterSearchActive) return []

    return valueFilterFamilies.flatMap(family =>
      rootSearchMatchesForFamily(family, normalizedRootFilterSearch)
    )
  })
  const hasRootFilterSearchMatches = $derived(
    rootValueFilterFamilyMatches.length > 0 ||
      rootTimeFilterFamilyMatches ||
      rootFilterOptionMatches.length > 0
  )
  const rootFilterScrollKey = $derived(
    [
      normalizedRootFilterSearch,
      rootValueFilterFamilyMatches.length,
      rootTimeFilterFamilyMatches,
      rootFilterOptionMatches.length,
      rootTeamSuggestionsQuery.isFetching,
    ].join(':')
  )
  const timeRangeValidation = $derived(
    resolveTimeRangeFilter(filters.time, clientConfig?.startTime)
  )
  const timeRangeError = $derived(timeRangeValidation.error)
  const timeRangeSummary = $derived(formatTimeRange())

  const submissionsQuery = useInfiniteAdminSubmissions(
    () => submissionFilterParams(filters, sortBy, sortOrder, clientConfig?.startTime),
    () => PAGE_SIZE
  )
  const allSubmissions = $derived(
    (submissionsQuery.data?.pages.flatMap(page => page.submissions) ?? []) as Submission[]
  )
  const showQueryError = $derived(!!submissionsQuery.error && !submissionsQuery.data)
  const expandedSubmissionIndex = $derived(
    expandedSubmissionId
      ? allSubmissions.findIndex(submission => submission.id === expandedSubmissionId)
      : -1
  )
  const visibleRowCount = $derived(allSubmissions.length + (expandedSubmissionIndex === -1 ? 0 : 1))
  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 12,
    onLoadMore: () => submissionsQuery.fetchNextPage(),
  })

  $effect(() => {
    scroll.state.count = visibleRowCount + (submissionsQuery.hasNextPage ? 1 : 0)
    scroll.state.hasNextPage = submissionsQuery.hasNextPage ?? false
    scroll.state.isFetching = submissionsQuery.isFetchingNextPage
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
    if (expandedSubmissionId && expandedSubmissionIndex === -1) {
      expandedSubmissionId = null
    }
  })

  $effect(() => {
    queryFingerprint
    expandedSubmissionId = null
    const viewport = scroll.state.viewportRef
    if (viewport) viewport.scrollTop = 0
  })

  function formatTimeRange() {
    if (timeRangeError) return 'Invalid time range'

    const startLabel =
      filters.time.mode === 'relative'
        ? formatRelativeTimeRangeEndpoint(timeRangeValidation.createdAfter)
        : formatDateTimeInput(filters.time.start)
    const endLabel =
      filters.time.mode === 'relative'
        ? formatRelativeTimeRangeEndpoint(timeRangeValidation.createdBefore)
        : formatDateTimeInput(filters.time.end)

    if (startLabel && endLabel) return `${startLabel} to ${endLabel}`
    if (startLabel) return `After ${startLabel}`
    if (endLabel) return `Before ${endLabel}`
    return ''
  }

  function formatDateTimeInput(value: string) {
    if (!value.trim()) return ''
    const time = new Date(value).getTime()
    return Number.isFinite(time) ? formatLocalTime(time) : 'Invalid time'
  }

  function formatRelativeTimeRangeEndpoint(value: string | undefined) {
    if (!value || clientConfig?.startTime === null || clientConfig?.startTime === undefined) {
      return ''
    }

    return formatCtfOffset(new Date(value).getTime(), clientConfig.startTime)
  }

  function setSort(nextSortBy: SortBy) {
    if (sortBy === nextSortBy) {
      sortOrder =
        sortOrder === SubmissionSortOrder.ASC ? SubmissionSortOrder.DESC : SubmissionSortOrder.ASC
      return
    }

    sortBy = nextSortBy
    sortOrder =
      nextSortBy === SubmissionSortBy.CREATED_AT
        ? SubmissionSortOrder.DESC
        : SubmissionSortOrder.ASC
  }

  function toggleSubmission(submissionId: string) {
    expandedSubmissionId = expandedSubmissionId === submissionId ? null : submissionId
  }

  function isDetailRowIndex(index: number) {
    return expandedSubmissionIndex !== -1 && index === expandedSubmissionIndex + 1
  }

  function submissionIndexForVirtualRow(index: number) {
    return expandedSubmissionIndex !== -1 && index > expandedSubmissionIndex ? index - 1 : index
  }
</script>

{#snippet loadingRow(row: VirtualRow)}
  <div
    class="absolute top-0 left-0 flex w-full items-center justify-center"
    style:height={`${row.size}px`}
    style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
  >
    {#if submissionsQuery.hasNextPage}
      <Spinner class="text-foreground-l3 size-5" />
    {/if}
  </div>
{/snippet}

{#snippet virtualRows()}
  <div
    class="relative contain-[layout_style] backface-hidden"
    style:height={`${scroll.totalSize}px`}
  >
    {#each scroll.virtualItems as row (row.index)}
      {#if row.index >= visibleRowCount}
        {@render loadingRow(row)}
      {:else if isDetailRowIndex(row.index)}
        <SubmissionDetailRow
          {row}
          submission={allSubmissions[expandedSubmissionIndex]!}
          {listScrollMargin}
          onClose={() => (expandedSubmissionId = null)}
        />
      {:else}
        {@const index = submissionIndexForVirtualRow(row.index)}
        <SubmissionTableRow
          {row}
          submission={allSubmissions[index]!}
          {index}
          {expandedSubmissionId}
          {listScrollMargin}
          ctfStartTime={clientConfig?.startTime}
          onToggle={toggleSubmission}
        />
      {/if}
    {/each}
  </div>
{/snippet}

{#snippet submissionsTable()}
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
    <div class="min-h-full w-full min-w-[91rem] text-sm">
      <div class="flex min-h-full flex-col">
        <div bind:this={tableHeaderRef} class="bg-background-l1 sticky top-0 z-50">
          <SubmissionsFilterBar
            bind:filters
            bind:rootFilterSearch
            valueFamilies={valueFilterFamilies}
            timeFamily={timeFilterFamily}
            rootValueFamilyMatches={rootValueFilterFamilyMatches}
            rootTimeFamilyMatches={rootTimeFilterFamilyMatches}
            rootOptionMatches={rootFilterOptionMatches}
            {rootFilterScrollKey}
            isRootSearchActive={isRootFilterSearchActive}
            hasRootSearchMatches={hasRootFilterSearchMatches}
            isSearchingTeams={rootTeamSuggestionsQuery.isFetching}
            {hasFilters}
            {timeRangeSummary}
            {timeRangeError}
          />
          <SubmissionsTableHeader {sortBy} {sortOrder} onSort={setSort} />
        </div>
        {#if allSubmissions.length === 0}
          <EmptyState
            icon={IconTableFilled}
            title={hasFilters ? 'No matching submissions' : 'No submissions'}
            subtitle={hasFilters
              ? 'Adjust or clear the filters to broaden the audit trail.'
              : 'Submission IPs will appear here once teams submit flags or admin bot jobs'}
            class="min-h-80 flex-1"
          />
        {:else}
          {@render virtualRows()}
        {/if}
      </div>
    </div>
  </ScrollArea>
{/snippet}

<svelte:head>
  {#if clientConfig}
    <title>Submissions | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

<div class="h-[calc(100dvh-72px)] w-full overflow-hidden px-4 pt-0 pb-4 md:px-9">
  {#if submissionsQuery.isPending}
    <div class="flex h-full items-center justify-center">
      <Spinner class="size-6" />
    </div>
  {:else if showQueryError}
    <div class="flex h-full items-center justify-center">
      <Card.Root class="max-w-md">
        <Card.Header>
          <Card.Title>Error</Card.Title>
        </Card.Header>
        <Card.Content>
          <p class="text-foreground-l3">{submissionsQuery.error?.message}</p>
        </Card.Content>
      </Card.Root>
    </div>
  {:else}
    {@render submissionsTable()}
  {/if}
</div>
