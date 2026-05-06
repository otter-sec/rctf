<script lang="ts">
  import {
    SubmissionLogKind,
    SubmissionLogResult,
    SubmissionLogSortBy,
    SubmissionLogSortOrder,
    SubmissionLogTeamStatus,
  } from '@rctf/types'
  import {
    Avatar,
    Card,
    DropdownMenu,
    EmptyState,
    ScrollArea,
    Spinner,
    Tooltip,
  } from '$lib/components'
  import {
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconChevronUp,
    IconClockFilled,
    IconFilter,
    IconFlag3Filled,
    IconGavel,
    IconLayoutListFilled,
    IconPlus,
    IconPuzzleFilled,
    IconRobot,
    IconSearch,
    IconSelector,
    IconShieldFilled,
    IconTableFilled,
    IconUsersGroup,
    IconX,
    type IconComponent,
  } from '$lib/icons'
  import {
    useAdminChallenges,
    useClientConfig,
    useInfiniteAdminSubmissionLogs,
    useInfiniteAdminUsers,
  } from '$lib/query'
  import {
    cn,
    formatCtfOffset,
    formatLocalTime,
    getCategoryConfig,
    getCategoryStyle,
    getInitials,
    useInfiniteVirtualScroll,
  } from '$lib/utils'
  import {
    clearFilter,
    clearSearchFilter,
    clearSubmissionLogFilters,
    clearTimeRangeFilter,
    createSubmissionLogFilters,
    filterOperatorLabel,
    hasSubmissionLogFilters,
    hasTimeRangeFilter,
    includeOperatorLabel,
    resolveTimeRangeFilter,
    setFilterMode,
    submissionLogFilterFingerprint,
    submissionLogFilterParams,
    toggleFilterOption,
    type FilterMode,
    type MultiFilter,
    type ValueFilterId,
  } from './submission-log-filters'
  import {
    canInspectIp,
    detailEntries,
    ipInfoUrl,
    KIND_FILTERS,
    kindLabel,
    RESULT_FILTERS,
    resultLabel,
    resultTone,
    TEAM_STATUS_FILTERS,
    teamStatusLabel,
    type CategoryFilterOption,
    type ChallengeFilterOption,
    type DivisionFilterOption,
    type SortBy,
    type SubmissionLog,
    type TeamFilterOption,
  } from './submission-log-utils'

  type ValueFilterFamily = {
    id: ValueFilterId
    label: string
    pluralLabel: string
    icon: IconComponent
    menuSize: 'search' | 'narrow' | 'medium'
    chipWidth?: 'challenge' | 'team'
    searchTerms?: readonly string[]
  }
  type TimeFilterFamily = {
    id: 'time'
    label: string
    icon: IconComponent
    searchTerms: readonly string[]
  }
  type RootFilterOptionMatch =
    | { familyId: 'challenge'; key: string; option: ChallengeFilterOption }
    | { familyId: 'team'; key: string; option: TeamFilterOption }
    | { familyId: 'kind'; key: string; option: SubmissionLogKind }
    | { familyId: 'result'; key: string; option: SubmissionLogResult }
    | { familyId: 'teamStatus'; key: string; option: SubmissionLogTeamStatus }
    | { familyId: 'category'; key: string; option: CategoryFilterOption }
    | { familyId: 'division'; key: string; option: DivisionFilterOption }

  const PAGE_SIZE = 100
  const ROW_HEIGHT = 48
  const ROOT_SEARCH_MATCH_LIMIT = 8
  const VALUE_FILTER_FAMILIES = [
    {
      id: 'challenge',
      label: 'Challenge',
      pluralLabel: 'challenges',
      icon: IconPuzzleFilled,
      menuSize: 'search',
      chipWidth: 'challenge',
    },
    {
      id: 'team',
      label: 'Team',
      pluralLabel: 'teams',
      icon: IconUsersGroup,
      menuSize: 'search',
      chipWidth: 'team',
    },
    {
      id: 'kind',
      label: 'Kind',
      pluralLabel: 'kinds',
      icon: IconFlag3Filled,
      menuSize: 'narrow',
    },
    {
      id: 'result',
      label: 'Result',
      pluralLabel: 'results',
      icon: IconTableFilled,
      menuSize: 'medium',
    },
    {
      id: 'teamStatus',
      label: 'Team status',
      pluralLabel: 'statuses',
      icon: IconGavel,
      menuSize: 'medium',
    },
    {
      id: 'category',
      label: 'Category',
      pluralLabel: 'categories',
      icon: IconLayoutListFilled,
      menuSize: 'medium',
    },
    {
      id: 'division',
      label: 'Division',
      pluralLabel: 'divisions',
      icon: IconShieldFilled,
      menuSize: 'medium',
    },
  ] satisfies ValueFilterFamily[]
  const TIME_FILTER_FAMILY = {
    id: 'time',
    label: 'Time',
    icon: IconClockFilled,
    searchTerms: ['date', 'range', 'ctf', 'relative'],
  } satisfies TimeFilterFamily
  const VALUE_FILTER_FAMILY_BY_ID = Object.fromEntries(
    VALUE_FILTER_FAMILIES.map(family => [family.id, family])
  ) as Record<ValueFilterId, ValueFilterFamily>
  type VirtualRow = { index: number; size: number; start: number }

  let sortBy = $state<SortBy>(SubmissionLogSortBy.CREATED_AT)
  let sortOrder = $state<SubmissionLogSortOrder>(SubmissionLogSortOrder.DESC)
  let filters = $state(createSubmissionLogFilters())
  let rootFilterSearch = $state('')
  let expandedLogId = $state<string | null>(null)
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
  const hasFilters = $derived(hasSubmissionLogFilters(filters))
  const queryFingerprint = $derived(
    `${sortBy}:${sortOrder}:${submissionLogFilterFingerprint(filters)}`
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
  const rootValueFilterFamilyMatches = $derived(
    VALUE_FILTER_FAMILIES.filter(family =>
      rootFilterFamilyMatchesSearch(family, normalizedRootFilterSearch)
    )
  )
  const rootTimeFilterFamilyMatches = $derived(
    rootFilterFamilyMatchesSearch(TIME_FILTER_FAMILY, normalizedRootFilterSearch)
  )
  const rootFilterOptionMatches = $derived.by(() => {
    if (!isRootFilterSearchActive) return []

    return VALUE_FILTER_FAMILIES.flatMap(family =>
      rootSearchMatchesForFamily(family, normalizedRootFilterSearch)
    )
  })
  const hasRootFilterSearchMatches = $derived(
    rootValueFilterFamilyMatches.length > 0 ||
      rootTimeFilterFamilyMatches ||
      rootFilterOptionMatches.length > 0
  )
  const timeRangeValidation = $derived(
    resolveTimeRangeFilter(filters.time, clientConfig?.startTime)
  )
  const timeRangeError = $derived(timeRangeValidation.error)
  const timeRangeSummary = $derived(formatTimeRange())

  const logsQuery = useInfiniteAdminSubmissionLogs(
    () => submissionLogFilterParams(filters, sortBy, sortOrder, clientConfig?.startTime),
    () => PAGE_SIZE
  )
  const allLogs = $derived(
    (logsQuery.data?.pages.flatMap(page => page.logs) ?? []) as SubmissionLog[]
  )
  const showQueryError = $derived(!!logsQuery.error && !logsQuery.data)
  const expandedLogIndex = $derived(
    expandedLogId ? allLogs.findIndex(log => log.id === expandedLogId) : -1
  )
  const visibleRowCount = $derived(allLogs.length + (expandedLogIndex === -1 ? 0 : 1))
  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 12,
    onLoadMore: () => logsQuery.fetchNextPage(),
  })

  $effect(() => {
    scroll.state.count = visibleRowCount + (logsQuery.hasNextPage ? 1 : 0)
    scroll.state.hasNextPage = logsQuery.hasNextPage ?? false
    scroll.state.isFetching = logsQuery.isFetchingNextPage
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
    if (expandedLogId && expandedLogIndex === -1) {
      expandedLogId = null
    }
  })

  $effect(() => {
    queryFingerprint
    expandedLogId = null
    const viewport = scroll.state.viewportRef
    if (viewport) viewport.scrollTop = 0
  })

  function setSort(nextSortBy: SortBy) {
    if (sortBy === nextSortBy) {
      sortOrder =
        sortOrder === SubmissionLogSortOrder.ASC
          ? SubmissionLogSortOrder.DESC
          : SubmissionLogSortOrder.ASC
      return
    }

    sortBy = nextSortBy
    sortOrder =
      nextSortBy === SubmissionLogSortBy.CREATED_AT
        ? SubmissionLogSortOrder.DESC
        : SubmissionLogSortOrder.ASC
  }

  function clearFilters() {
    clearSubmissionLogFilters(filters)
  }

  function updateChallengeSearch(value: string) {
    filters.challenge.search = value
  }

  function updateTeamSearch(value: string) {
    filters.team.search = value
  }

  function updateRootFilterSearch(value: string) {
    rootFilterSearch = value
  }

  function normalizeSearchText(value: string) {
    return value.trim().toLowerCase()
  }

  function searchMatches(query: string, ...values: string[]) {
    if (!query) return false
    return values.some(value => normalizeSearchText(value).includes(query))
  }

  function rootFilterFamilyMatchesSearch(
    family: ValueFilterFamily | TimeFilterFamily,
    query: string
  ) {
    const pluralLabel = 'pluralLabel' in family ? family.pluralLabel : ''
    const extraTerms = query.length > 1 ? (family.searchTerms ?? []) : []
    return searchMatches(query, family.label, pluralLabel, ...extraTerms)
  }

  function uniqueTeamOptions(
    teams: { id: string; name: string; avatarUrl: string | null }[]
  ): TeamFilterOption[] {
    const seen = new Set<string>()

    return teams
      .filter(team => {
        if (seen.has(team.id)) return false
        seen.add(team.id)
        return true
      })
      .map(team => ({
        id: team.id,
        name: team.name,
        avatarUrl: team.avatarUrl,
      }))
  }

  function takeRootSearchMatches<T>(options: readonly T[], matches: (option: T) => boolean) {
    return options.filter(matches).slice(0, ROOT_SEARCH_MATCH_LIMIT)
  }

  function rootSearchMatchesForFamily(
    family: ValueFilterFamily,
    query: string
  ): RootFilterOptionMatch[] {
    switch (family.id) {
      case 'challenge':
        return takeRootSearchMatches(allChallengeOptions, challenge => {
          const category = getCategoryConfig(challenge.category)
          return searchMatches(query, challenge.name, challenge.category, category.name)
        }).map(challenge => ({
          familyId: 'challenge',
          key: challenge.id,
          option: challenge,
        }))
      case 'team':
        return takeRootSearchMatches(rootTeamOptions, team => searchMatches(query, team.name)).map(
          team => ({
            familyId: 'team',
            key: team.id,
            option: team,
          })
        )
      case 'kind':
        return takeRootSearchMatches(KIND_FILTERS, kind =>
          searchMatches(query, kindLabel(kind), kind)
        ).map(kind => ({
          familyId: 'kind',
          key: kind,
          option: kind,
        }))
      case 'result':
        return takeRootSearchMatches(RESULT_FILTERS, result =>
          searchMatches(query, resultLabel(result), result)
        ).map(result => ({
          familyId: 'result',
          key: result,
          option: result,
        }))
      case 'teamStatus':
        return takeRootSearchMatches(TEAM_STATUS_FILTERS, status =>
          searchMatches(query, teamStatusLabel(status), status)
        ).map(status => ({
          familyId: 'teamStatus',
          key: status,
          option: status,
        }))
      case 'category':
        return takeRootSearchMatches(categoryOptions, category => {
          const config = getCategoryConfig(category.value)
          return searchMatches(query, category.label, category.value, config.name)
        }).map(category => ({
          familyId: 'category',
          key: category.value,
          option: category,
        }))
      case 'division':
        return takeRootSearchMatches(divisionOptions, division =>
          searchMatches(query, division.label, division.value)
        ).map(division => ({
          familyId: 'division',
          key: division.value,
          option: division,
        }))
    }
  }

  function rootFilterOptionKey(match: RootFilterOptionMatch) {
    return `${match.familyId}:${match.key}`
  }

  function rootSearchMatchFamily(match: RootFilterOptionMatch) {
    return VALUE_FILTER_FAMILY_BY_ID[match.familyId]
  }

  function valueFilter(family: ValueFilterFamily): MultiFilter<unknown> {
    return filters[family.id] as MultiFilter<unknown>
  }

  function clearValueFilter(family: ValueFilterFamily) {
    switch (family.id) {
      case 'challenge':
        clearSearchFilter(filters.challenge)
        return
      case 'team':
        clearSearchFilter(filters.team)
        return
      case 'kind':
        clearFilter(filters.kind)
        return
      case 'result':
        clearFilter(filters.result)
        return
      case 'teamStatus':
        clearFilter(filters.teamStatus)
        return
      case 'category':
        clearFilter(filters.category)
        return
      case 'division':
        clearFilter(filters.division)
        return
    }
  }

  function toggleChallenge(challenge: ChallengeFilterOption) {
    toggleFilterOption(filters.challenge, challenge, item => item.id)
  }

  function toggleTeam(team: TeamFilterOption) {
    toggleFilterOption(filters.team, team, item => item.id)
  }

  function toggleKind(kind: SubmissionLogKind) {
    toggleFilterOption(filters.kind, kind, item => item)
  }

  function toggleResult(result: SubmissionLogResult) {
    toggleFilterOption(filters.result, result, item => item)
  }

  function toggleTeamStatus(status: SubmissionLogTeamStatus) {
    toggleFilterOption(filters.teamStatus, status, item => item)
  }

  function toggleCategory(category: CategoryFilterOption) {
    toggleFilterOption(filters.category, category, item => item.value)
  }

  function toggleDivision(division: DivisionFilterOption) {
    toggleFilterOption(filters.division, division, item => item.value)
  }

  function setRelativeTimeRange(enabled: boolean) {
    filters.time.mode = enabled ? 'relative' : 'absolute'
  }

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

  function toggleLog(logId: string) {
    expandedLogId = expandedLogId === logId ? null : logId
  }

  function handleRowKeydown(event: KeyboardEvent, logId: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggleLog(logId)
  }

  function isDetailRowIndex(index: number) {
    return expandedLogIndex !== -1 && index === expandedLogIndex + 1
  }

  function logIndexForVirtualRow(index: number) {
    return expandedLogIndex !== -1 && index > expandedLogIndex ? index - 1 : index
  }
</script>

{#snippet sortIndicator(column: SortBy)}
  {#if sortBy === column}
    {#if sortOrder === SubmissionLogSortOrder.ASC}
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

{#snippet resultDot(result: string)}
  {@const tone = resultTone(result)}
  <span
    class={cn(
      'size-1.5 shrink-0 rounded-full',
      tone === 'success'
        ? 'bg-foreground-success'
        : tone === 'warning'
          ? 'bg-foreground-yellow-l1'
          : 'bg-foreground-destructive'
    )}
  ></span>
{/snippet}

{#snippet resultText(result: string)}
  {@const tone = resultTone(result)}
  <span
    class={cn(
      'inline-flex min-w-0 items-center gap-1.5 truncate whitespace-nowrap',
      tone === 'success'
        ? 'text-foreground-success'
        : tone === 'warning'
          ? 'text-foreground-yellow-l1'
          : 'text-foreground-destructive'
    )}
  >
    {@render resultDot(result)}
    <span class="min-w-0 truncate">{resultLabel(result)}</span>
  </span>
{/snippet}

{#snippet operatorDropdown(mode: FilterMode, count: number, onSelect: (mode: FilterMode) => void)}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l2 flex h-full items-center gap-1 border-r-2 px-2 transition-colors"
    >
      {filterOperatorLabel(mode, count)}
      <IconChevronDown class="size-3" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      align="start"
      class="bg-background-l4 border-foreground-l4/40 z-[120] w-36 border-2 shadow-xl"
    >
      <DropdownMenu.Item
        class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2"
        onclick={() => onSelect('include')}
      >
        <IconCheck class={cn('size-4', mode !== 'include' && 'text-transparent')} />
        {includeOperatorLabel(count)}
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2"
        onclick={() => onSelect('exclude')}
      >
        <IconCheck class={cn('size-4', mode !== 'exclude' && 'text-transparent')} />
        is not
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/snippet}

{#snippet filterSearchInput(value: string, placeholder: string, onInput: (value: string) => void)}
  <div
    role="presentation"
    class="text-foreground-l3 border-foreground-l4/40 flex h-11 shrink-0 items-center gap-2 border-b-2 px-3"
    onclick={event => event.stopPropagation()}
    onkeydown={event => event.stopPropagation()}
    onpointerdown={event => event.stopPropagation()}
  >
    <IconSearch class="size-3.5 shrink-0" />
    <input
      type="text"
      {placeholder}
      {value}
      oninput={event => onInput(event.currentTarget.value)}
      class="placeholder:text-foreground-l4 text-foreground-l1 min-w-0 flex-1 bg-transparent text-sm outline-none"
    />
  </div>
{/snippet}

{#snippet rootSearchPath(family: ValueFilterFamily)}
  <span class="text-foreground-l3 flex shrink-0 items-center gap-1">
    <family.icon class="size-3.5" />
    <span>{family.label}</span>
  </span>
  <IconChevronRight class="text-foreground-l4 size-3 shrink-0" />
{/snippet}

{#snippet challengeOption(challenge: ChallengeFilterOption, family?: ValueFilterFamily)}
  {@const category = getCategoryConfig(challenge.category)}
  {@const selected = filters.challenge.selected.some(item => item.id === challenge.id)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={family
      ? `${family.label} ${challenge.category} ${challenge.name}`
      : `${challenge.category} ${challenge.name}`}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    style={getCategoryStyle(category.color)}
    onCheckedChange={checked => {
      if (checked !== selected) toggleChallenge(challenge)
    }}
  >
    {#if family}
      {@render rootSearchPath(family)}
    {/if}
    <span class="min-w-0 truncate text-sm">
      <span class="text-category-foreground-l1">{challenge.category} /</span>
      <span class="text-category-foreground-l0">{challenge.name}</span>
    </span>
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet teamOption(team: TeamFilterOption, family?: ValueFilterFamily)}
  {@const selected = filters.team.selected.some(item => item.id === team.id)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={family ? `${family.label} ${team.name}` : team.name}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onCheckedChange={checked => {
      if (checked !== selected) toggleTeam(team)
    }}
  >
    {#if family}
      {@render rootSearchPath(family)}
    {/if}
    <Avatar.Root class="size-5 rounded-md">
      {#if team.avatarUrl}
        <Avatar.Image src={team.avatarUrl} alt={team.name} class="rounded-md object-cover" />
      {/if}
      <Avatar.Fallback class="rounded-md text-[9px]">
        {getInitials(team.name)}
      </Avatar.Fallback>
    </Avatar.Root>
    <span class="min-w-0 truncate text-sm">{team.name}</span>
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet challengeSelector()}
  {@render filterSearchInput(
    filters.challenge.search,
    'Filter challenges...',
    updateChallengeSearch
  )}
  <ScrollArea
    class="min-h-0 flex-1"
    fadeSize={28}
    fadeColor="background-l4"
    scrollbarYClasses="hidden"
  >
    <div class="p-1">
      {#if challengesQuery.isPending}
        <div class="text-foreground-l3 flex items-center gap-2 px-2 py-1.5 text-sm">
          <Spinner class="size-3.5" />
          Loading challenges...
        </div>
      {:else if challengeOptions.length === 0}
        <div class="text-foreground-l3 px-2 py-1.5 text-sm">No challenges found</div>
      {:else}
        {#each challengeOptions as challenge (challenge.id)}
          {@render challengeOption(challenge)}
        {/each}
      {/if}
    </div>
  </ScrollArea>
{/snippet}

{#snippet teamSelector()}
  {@render filterSearchInput(filters.team.search, 'Filter teams...', updateTeamSearch)}
  <ScrollArea
    class="min-h-0 flex-1"
    fadeSize={28}
    fadeColor="background-l4"
    scrollbarYClasses="hidden"
  >
    <div class="p-1">
      {#if teamSuggestionsQuery.isFetching && teamOptions.length === 0}
        <div class="text-foreground-l3 flex items-center gap-2 px-2 py-1.5 text-sm">
          <Spinner class="size-3.5" />
          Loading teams...
        </div>
      {:else if teamOptions.length === 0}
        <div class="text-foreground-l3 px-2 py-1.5 text-sm">No teams found</div>
      {:else}
        {#each teamOptions as team (team.id)}
          {@render teamOption(team)}
        {/each}
      {/if}
    </div>
  </ScrollArea>
{/snippet}

{#snippet kindOption(kind: SubmissionLogKind, family?: ValueFilterFamily)}
  {@const selected = filters.kind.selected.includes(kind)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={family ? `${family.label} ${kindLabel(kind)}` : kindLabel(kind)}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onCheckedChange={checked => {
      if (checked !== selected) toggleKind(kind)
    }}
  >
    {#if family}
      {@render rootSearchPath(family)}
    {/if}
    {#if kind === SubmissionLogKind.ADMIN_BOT}
      <IconRobot class="size-4" />
    {:else}
      <IconFlag3Filled class="size-4" />
    {/if}
    {kindLabel(kind)}
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet kindSelector()}
  <div class="p-1">
    {#each KIND_FILTERS as kind}
      {@render kindOption(kind)}
    {/each}
  </div>
{/snippet}

{#snippet resultOption(result: SubmissionLogResult, family?: ValueFilterFamily)}
  {@const selected = filters.result.selected.includes(result)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={family ? `${family.label} ${resultLabel(result)}` : resultLabel(result)}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onCheckedChange={checked => {
      if (checked !== selected) toggleResult(result)
    }}
  >
    {#if family}
      {@render rootSearchPath(family)}
    {/if}
    {@render resultText(result)}
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet resultSelector()}
  <div class="p-1">
    {#each RESULT_FILTERS as result}
      {@render resultOption(result)}
    {/each}
  </div>
{/snippet}

{#snippet teamStatusOption(status: SubmissionLogTeamStatus, family?: ValueFilterFamily)}
  {@const selected = filters.teamStatus.selected.includes(status)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={family ? `${family.label} ${teamStatusLabel(status)}` : teamStatusLabel(status)}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onCheckedChange={checked => {
      if (checked !== selected) toggleTeamStatus(status)
    }}
  >
    {#if family}
      {@render rootSearchPath(family)}
    {/if}
    {#if status === SubmissionLogTeamStatus.BANNED}
      <IconGavel class="size-4" />
    {:else}
      <IconShieldFilled class="size-4" />
    {/if}
    {teamStatusLabel(status)}
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet teamStatusSelector()}
  <div class="p-1">
    {#each TEAM_STATUS_FILTERS as status}
      {@render teamStatusOption(status)}
    {/each}
  </div>
{/snippet}

{#snippet categoryOption(category: CategoryFilterOption, family?: ValueFilterFamily)}
  {@const selected = filters.category.selected.some(item => item.value === category.value)}
  {@const categoryConfig = getCategoryConfig(category.value)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={family ? `${family.label} ${category.label}` : category.label}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    style={getCategoryStyle(categoryConfig.color)}
    onCheckedChange={checked => {
      if (checked !== selected) toggleCategory(category)
    }}
  >
    {#if family}
      {@render rootSearchPath(family)}
    {/if}
    <categoryConfig.icon class="text-category-foreground-l1 size-4 shrink-0" />
    <span class="text-category-foreground-l0 min-w-0 truncate text-sm">
      {category.label}
    </span>
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet categorySelector()}
  <div class="p-1">
    {#if challengesQuery.isPending}
      <div class="text-foreground-l3 flex items-center gap-2 px-2 py-1.5 text-sm">
        <Spinner class="size-3.5" />
        Loading categories...
      </div>
    {:else if categoryOptions.length === 0}
      <div class="text-foreground-l3 px-2 py-1.5 text-sm">No categories found</div>
    {:else}
      {#each categoryOptions as category (category.value)}
        {@render categoryOption(category)}
      {/each}
    {/if}
  </div>
{/snippet}

{#snippet divisionOption(division: DivisionFilterOption, family?: ValueFilterFamily)}
  {@const selected = filters.division.selected.some(item => item.value === division.value)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={family ? `${family.label} ${division.label}` : division.label}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onCheckedChange={checked => {
      if (checked !== selected) toggleDivision(division)
    }}
  >
    {#if family}
      {@render rootSearchPath(family)}
    {/if}
    <span class="min-w-0 truncate text-sm">{division.label}</span>
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet divisionSelector()}
  <div class="p-1">
    {#if divisionOptions.length === 0}
      <div class="text-foreground-l3 px-2 py-1.5 text-sm">No divisions found</div>
    {:else}
      {#each divisionOptions as division (division.value)}
        {@render divisionOption(division)}
      {/each}
    {/if}
  </div>
{/snippet}

{#snippet rootSearchOption(match: RootFilterOptionMatch)}
  {@const family = rootSearchMatchFamily(match)}
  {#if match.familyId === 'challenge'}
    {@render challengeOption(match.option, family)}
  {:else if match.familyId === 'team'}
    {@render teamOption(match.option, family)}
  {:else if match.familyId === 'kind'}
    {@render kindOption(match.option, family)}
  {:else if match.familyId === 'result'}
    {@render resultOption(match.option, family)}
  {:else if match.familyId === 'teamStatus'}
    {@render teamStatusOption(match.option, family)}
  {:else if match.familyId === 'category'}
    {@render categoryOption(match.option, family)}
  {:else if match.familyId === 'division'}
    {@render divisionOption(match.option, family)}
  {/if}
{/snippet}

{#snippet valueFilterSelector(family: ValueFilterFamily)}
  {#if family.id === 'challenge'}
    {@render challengeSelector()}
  {:else if family.id === 'team'}
    {@render teamSelector()}
  {:else if family.id === 'kind'}
    {@render kindSelector()}
  {:else if family.id === 'result'}
    {@render resultSelector()}
  {:else if family.id === 'teamStatus'}
    {@render teamStatusSelector()}
  {:else if family.id === 'category'}
    {@render categorySelector()}
  {:else if family.id === 'division'}
    {@render divisionSelector()}
  {/if}
{/snippet}

{#snippet valueFilterMenu(family: ValueFilterFamily)}
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger
      class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
    >
      <family.icon class="size-4" />
      {family.label}
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent
      align="start"
      alignOffset={-6}
      sideOffset={10}
      class={cn(
        'bg-background-l4 border-foreground-l4/40 z-[110] border-2 shadow-xl',
        family.menuSize === 'search' && 'flex h-80 w-72 flex-col overflow-hidden !p-0',
        family.menuSize === 'narrow' && 'w-48',
        family.menuSize === 'medium' && 'w-56'
      )}
    >
      {@render valueFilterSelector(family)}
    </DropdownMenu.SubContent>
  </DropdownMenu.Sub>
{/snippet}

{#snippet timeRangeSelector()}
  <div
    role="presentation"
    class="flex flex-col gap-3 p-3"
    onclick={event => event.stopPropagation()}
    onkeydown={event => event.stopPropagation()}
    onpointerdown={event => event.stopPropagation()}
  >
    <label class="text-foreground-l2 flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={filters.time.mode === 'relative'}
        class="sr-only"
        onchange={event => setRelativeTimeRange(event.currentTarget.checked)}
      />
      <span
        class={cn(
          'border-foreground-l4/60 flex size-4 items-center justify-center rounded-[4px] border-2',
          filters.time.mode === 'relative' &&
            'bg-foreground-l0 text-background-l0 border-foreground-l0'
        )}
      >
        {#if filters.time.mode === 'relative'}
          <IconCheck class="size-3" />
        {/if}
      </span>
      CTF-relative
    </label>
    {#if filters.time.mode === 'relative'}
      <label class="flex flex-col gap-1.5">
        <span class="text-foreground-l3 text-xs">From</span>
        <input
          type="text"
          value={filters.time.relativeStart}
          placeholder="2d 4h"
          aria-invalid={!!timeRangeError}
          class={cn(
            'bg-background-l2 text-foreground-l1 border-foreground-l4/40 h-9 rounded-md border px-2 text-sm outline-none',
            timeRangeError && 'border-foreground-destructive/70'
          )}
          oninput={event => (filters.time.relativeStart = event.currentTarget.value)}
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-foreground-l3 text-xs">To</span>
        <input
          type="text"
          value={filters.time.relativeEnd}
          placeholder="2d 6h"
          aria-invalid={!!timeRangeError}
          class={cn(
            'bg-background-l2 text-foreground-l1 border-foreground-l4/40 h-9 rounded-md border px-2 text-sm outline-none',
            timeRangeError && 'border-foreground-destructive/70'
          )}
          oninput={event => (filters.time.relativeEnd = event.currentTarget.value)}
        />
      </label>
    {:else}
      <label class="flex flex-col gap-1.5">
        <span class="text-foreground-l3 text-xs">From</span>
        <input
          type="datetime-local"
          value={filters.time.start}
          aria-invalid={!!timeRangeError}
          class={cn(
            'bg-background-l2 text-foreground-l1 border-foreground-l4/40 h-9 rounded-md border px-2 text-sm [color-scheme:dark] outline-none',
            timeRangeError && 'border-foreground-destructive/70'
          )}
          oninput={event => (filters.time.start = event.currentTarget.value)}
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-foreground-l3 text-xs">To</span>
        <input
          type="datetime-local"
          value={filters.time.end}
          aria-invalid={!!timeRangeError}
          class={cn(
            'bg-background-l2 text-foreground-l1 border-foreground-l4/40 h-9 rounded-md border px-2 text-sm [color-scheme:dark] outline-none',
            timeRangeError && 'border-foreground-destructive/70'
          )}
          oninput={event => (filters.time.end = event.currentTarget.value)}
        />
      </label>
    {/if}
    {#if timeRangeError}
      <p class="text-foreground-destructive text-xs">{timeRangeError}</p>
    {/if}
    {#if hasTimeRangeFilter(filters.time)}
      <button
        type="button"
        class="text-foreground-l3 hover:bg-background-l5 hover:text-foreground-l1 flex h-8 items-center justify-center rounded-md text-sm transition-colors"
        onclick={() => clearTimeRangeFilter(filters.time)}
      >
        Clear time range
      </button>
    {/if}
  </div>
{/snippet}

{#snippet timeRangeFilterMenu()}
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger
      class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
    >
      <IconClockFilled class="size-4" />
      Time
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent
      align="start"
      alignOffset={-6}
      sideOffset={10}
      class="bg-background-l4 border-foreground-l4/40 z-[110] w-72 border-2 !p-0 shadow-xl"
    >
      {@render timeRangeSelector()}
    </DropdownMenu.SubContent>
  </DropdownMenu.Sub>
{/snippet}

{#snippet rootFilterList()}
  <div class="p-1">
    {#each VALUE_FILTER_FAMILIES as family (family.id)}
      {@render valueFilterMenu(family)}
    {/each}
    {@render timeRangeFilterMenu()}
  </div>
{/snippet}

{#snippet rootFilterSearchResults()}
  <div class="p-1">
    {#each rootValueFilterFamilyMatches as family (family.id)}
      {@render valueFilterMenu(family)}
    {/each}
    {#if rootTimeFilterFamilyMatches}
      {@render timeRangeFilterMenu()}
    {/if}
    {#each rootFilterOptionMatches as match (rootFilterOptionKey(match))}
      {@render rootSearchOption(match)}
    {/each}
    {#if rootTeamSuggestionsQuery.isFetching}
      <div class="text-foreground-l3 flex items-center gap-2 px-2 py-1.5 text-sm">
        <Spinner class="size-3.5" />
        Searching teams...
      </div>
    {/if}
    {#if !hasRootFilterSearchMatches && !rootTeamSuggestionsQuery.isFetching}
      <div class="text-foreground-l3 px-2 py-1.5 text-sm">No filters found</div>
    {/if}
  </div>
{/snippet}

{#snippet filterMenu()}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      aria-label="Add filter"
      class={cn(
        'bg-background-l4 text-foreground-l2 hover:bg-background-l5 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors',
        hasFilters && 'text-foreground-accent'
      )}
    >
      <IconFilter class="size-4" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      align="start"
      class="bg-background-l4 border-foreground-l4/40 z-[100] w-80 border-2 !p-0 shadow-xl"
    >
      <DropdownMenu.Label class="text-foreground-l3 flex items-center gap-2 text-sm">
        <IconPlus class="size-4" />
        Add filter
      </DropdownMenu.Label>
      {@render filterSearchInput(rootFilterSearch, 'Search filters...', updateRootFilterSearch)}
      {#if isRootFilterSearchActive}
        {@render rootFilterSearchResults()}
      {:else}
        {@render rootFilterList()}
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/snippet}

{#snippet valueFilterCount(family: ValueFilterFamily)}
  {@const filter = valueFilter(family)}
  <span class="text-foreground-l1 min-w-0 truncate">
    {filter.selected.length}
    {family.pluralLabel}
  </span>
{/snippet}

{#snippet challengeChipValue(family: ValueFilterFamily)}
  {@const selected = filters.challenge.selected[0]}
  {@const category = selected ? getCategoryConfig(selected.category) : null}
  {#if filters.challenge.selected.length === 1 && selected}
    <span class="min-w-0 truncate" style={category ? getCategoryStyle(category.color) : undefined}>
      <span class="text-category-foreground-l1">{selected.category} /</span>
      <span class="text-category-foreground-l0">{selected.name}</span>
    </span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet teamChipValue(family: ValueFilterFamily)}
  {@const selected = filters.team.selected[0]}
  {#if filters.team.selected.length === 1 && selected}
    <Avatar.Root class="size-4 rounded">
      {#if selected.avatarUrl}
        <Avatar.Image src={selected.avatarUrl} alt={selected.name} class="rounded object-cover" />
      {/if}
      <Avatar.Fallback class="rounded text-[8px]">
        {getInitials(selected.name)}
      </Avatar.Fallback>
    </Avatar.Root>
    <span class="min-w-0 truncate">{selected.name}</span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet kindChipValue(family: ValueFilterFamily)}
  {@const selected = filters.kind.selected[0]}
  {#if filters.kind.selected.length === 1 && selected}
    {#if selected === SubmissionLogKind.ADMIN_BOT}
      <IconRobot class="size-3.5" />
    {:else}
      <IconFlag3Filled class="size-3.5" />
    {/if}
    <span class="text-foreground-l1 min-w-0 truncate">{kindLabel(selected)}</span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet resultChipValue(family: ValueFilterFamily)}
  {@const selected = filters.result.selected[0]}
  {#if filters.result.selected.length === 1 && selected}
    {@render resultText(selected)}
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet teamStatusChipValue(family: ValueFilterFamily)}
  {@const selected = filters.teamStatus.selected[0]}
  {#if filters.teamStatus.selected.length === 1 && selected}
    {#if selected === SubmissionLogTeamStatus.BANNED}
      <IconGavel class="size-3.5" />
    {:else}
      <IconShieldFilled class="size-3.5" />
    {/if}
    <span class="text-foreground-l1 min-w-0 truncate">{teamStatusLabel(selected)}</span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet categoryChipValue(family: ValueFilterFamily)}
  {@const selected = filters.category.selected[0]}
  {@const category = selected ? getCategoryConfig(selected.value) : null}
  {#if filters.category.selected.length === 1 && selected}
    <span class="min-w-0 truncate" style={category ? getCategoryStyle(category.color) : undefined}>
      <span class="text-category-foreground-l0">{selected.label}</span>
    </span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet divisionChipValue(family: ValueFilterFamily)}
  {@const selected = filters.division.selected[0]}
  {#if filters.division.selected.length === 1 && selected}
    <span class="text-foreground-l1 min-w-0 truncate">{selected.label}</span>
  {:else}
    {@render valueFilterCount(family)}
  {/if}
{/snippet}

{#snippet valueFilterChipValue(family: ValueFilterFamily)}
  {#if family.id === 'challenge'}
    {@render challengeChipValue(family)}
  {:else if family.id === 'team'}
    {@render teamChipValue(family)}
  {:else if family.id === 'kind'}
    {@render kindChipValue(family)}
  {:else if family.id === 'result'}
    {@render resultChipValue(family)}
  {:else if family.id === 'teamStatus'}
    {@render teamStatusChipValue(family)}
  {:else if family.id === 'category'}
    {@render categoryChipValue(family)}
  {:else if family.id === 'division'}
    {@render divisionChipValue(family)}
  {/if}
{/snippet}

{#snippet valueFilterChip(family: ValueFilterFamily)}
  {@const filter = valueFilter(family)}
  <span
    class={cn(
      'bg-background-l2 inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border-2 text-sm',
      family.chipWidth === 'challenge' && 'max-w-96',
      family.chipWidth === 'team' && 'max-w-80'
    )}
  >
    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r-2 px-2">
      <family.icon class="size-3.5" />
      {family.label}
    </span>
    {@render operatorDropdown(filter.mode, filter.selected.length, mode =>
      setFilterMode(filter, mode)
    )}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class="hover:bg-background-l3 flex h-full min-w-0 items-center gap-1.5 px-2 transition-colors"
      >
        {@render valueFilterChipValue(family)}
        <IconChevronDown class="text-foreground-l4 size-3 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        class={cn(
          'bg-background-l4 border-foreground-l4/40 z-[120] border-2 shadow-xl',
          family.menuSize === 'search' && 'flex h-80 w-72 flex-col overflow-hidden !p-0',
          family.menuSize === 'narrow' && 'w-48',
          family.menuSize === 'medium' && 'w-56'
        )}
      >
        {@render valueFilterSelector(family)}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    <button
      type="button"
      aria-label="Remove {family.label.toLowerCase()} filters"
      class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l-2"
      onclick={() => clearValueFilter(family)}
    >
      <IconX class="size-3.5" />
    </button>
  </span>
{/snippet}

{#snippet timeRangeChip()}
  <span
    class={cn(
      'bg-background-l2 inline-flex h-8 max-w-[32rem] shrink-0 items-center overflow-hidden rounded-md border-2 text-sm',
      timeRangeError && 'border-foreground-destructive/70'
    )}
  >
    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r-2 px-2">
      <IconClockFilled class="size-3.5" />
      Time
    </span>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class="text-foreground-l1 hover:bg-background-l3 flex h-full min-w-0 items-center gap-1.5 px-2 transition-colors"
      >
        <span class="min-w-0 truncate">{timeRangeSummary}</span>
        <IconChevronDown class="text-foreground-l4 size-3 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        class="bg-background-l4 border-foreground-l4/40 z-[120] w-72 border-2 !p-0 shadow-xl"
      >
        {@render timeRangeSelector()}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    <button
      type="button"
      aria-label="Remove time filter"
      class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l-2"
      onclick={() => clearTimeRangeFilter(filters.time)}
    >
      <IconX class="size-3.5" />
    </button>
  </span>
{/snippet}

{#snippet filterChips()}
  <div class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap">
    {#each VALUE_FILTER_FAMILIES as family (family.id)}
      {#if valueFilter(family).selected.length > 0}
        {@render valueFilterChip(family)}
      {/if}
    {/each}
    {#if hasTimeRangeFilter(filters.time)}
      {@render timeRangeChip()}
    {/if}
  </div>
{/snippet}

{#snippet filterToolbar()}
  <div
    class="relative z-20 flex min-w-0 items-center gap-1.5 overflow-visible border-b-2 px-3 py-2"
  >
    {@render filterMenu()}
    {@render filterChips()}
    {#if hasFilters}
      <button
        type="button"
        class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm transition-colors"
        onclick={clearFilters}
      >
        <IconX class="size-3.5" />
        Clear
      </button>
    {/if}
    {#if timeRangeError}
      <span class="text-foreground-destructive shrink-0 px-1 text-sm">{timeRangeError}</span>
    {/if}
  </div>
{/snippet}

{#snippet tableHeader()}
  <div
    class="bg-background-l3 text-foreground-l3 relative z-10 grid grid-cols-[2.75rem_16rem_20rem_minmax(16rem,1fr)_11rem_9rem_10rem] border-b-2 text-base"
  >
    <div></div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.CREATED_AT, 'Time')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.CHALLENGE, 'Challenge')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.TEAM, 'Team')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.IP, 'IP')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.KIND, 'Kind')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.RESULT, 'Result')}
    </div>
  </div>
{/snippet}

{#snippet loadingRow(row: VirtualRow)}
  <div
    class="absolute top-0 left-0 flex w-full items-center justify-center"
    style:height={`${row.size}px`}
    style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
  >
    {#if logsQuery.hasNextPage}
      <Spinner class="text-foreground-l3 size-5" />
    {/if}
  </div>
{/snippet}

{#snippet detailPill(entry: { label: string; value: string })}
  <Tooltip.Root>
    <Tooltip.Trigger>
      <span
        class={cn(
          'bg-background-l4 inline-flex min-w-0 shrink-0 items-center gap-1 rounded-md px-2 py-1 whitespace-nowrap',
          entry.label === 'error' ? 'max-w-[36rem]' : 'max-w-[28rem]'
        )}
      >
        <span class="text-foreground-l3 shrink-0 text-xs">{entry.label}</span>
        <code class="text-foreground-l1 min-w-0 truncate text-xs">{entry.value}</code>
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content class="max-w-md break-all">{entry.label}: {entry.value}</Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet detailRow(row: VirtualRow, log: SubmissionLog)}
  {@const entries = detailEntries(log)}
  <div
    class="absolute top-0 left-0 w-full will-change-transform contain-[layout_style_paint]"
    style:height={`${row.size}px`}
    style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
  >
    <div class="bg-background-l3 flex h-full min-w-0 items-center gap-2 overflow-hidden px-3 pl-12">
      <span class="text-foreground-l3 shrink-0 text-sm whitespace-nowrap">Submitted</span>
      <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 whitespace-nowrap">
        {#each entries as entry (`${log.id}:${entry.label}:${entry.value}`)}
          {@render detailPill(entry)}
        {/each}
      </div>
      <button
        type="button"
        aria-label="Close submitted details"
        class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
        onclick={() => (expandedLogId = null)}
      >
        <IconX class="size-4" />
      </button>
    </div>
  </div>
{/snippet}

{#snippet timeCell(log: SubmissionLog)}
  {@const timestamp = new Date(log.createdAt).getTime()}
  {@const ctfOffset = formatCtfOffset(timestamp, clientConfig?.startTime)}
  <Tooltip.Root>
    <Tooltip.Trigger class="block max-w-full min-w-0 overflow-hidden">
      <div class="flex max-w-full min-w-0 items-baseline gap-2 overflow-hidden whitespace-nowrap">
        <span class="text-foreground-l1 shrink-0 tabular-nums">
          {formatLocalTime(timestamp)}
        </span>
        {#if ctfOffset}
          <span class="text-foreground-l3 min-w-0 truncate text-xs tabular-nums">
            {ctfOffset}
          </span>
        {/if}
      </div>
    </Tooltip.Trigger>
    <Tooltip.Content>UTC {new Date(log.createdAt).toISOString()}</Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet challengeCell(log: SubmissionLog)}
  {@const category = getCategoryConfig(log.challengeCategory)}
  <a
    href="/challenges?challenge={log.challengeId}"
    class="group flex max-w-full min-w-0 items-center overflow-hidden whitespace-nowrap"
    style={getCategoryStyle(category.color)}
    onclick={event => event.stopPropagation()}
  >
    <span class="min-w-0 truncate text-base leading-tight">
      <span class="text-category-foreground-l1">{log.challengeCategory} /</span>
      <span class="text-category-foreground-l0 group-hover:underline">{log.challengeName}</span>
    </span>
  </a>
{/snippet}

{#snippet teamCell(log: SubmissionLog)}
  <div
    class={cn(
      'flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap',
      log.userBanned && 'opacity-70'
    )}
  >
    <Avatar.Root class="size-8 shrink-0 rounded-lg">
      {#if log.userAvatarUrl}
        <Avatar.Image src={log.userAvatarUrl} alt={log.userName} class="rounded-lg object-cover" />
      {/if}
      <Avatar.Fallback class="rounded-lg text-xs">{getInitials(log.userName)}</Avatar.Fallback>
    </Avatar.Root>
    <a
      href="/profile/{log.userId}"
      class="text-foreground-l1 min-w-0 truncate text-base leading-tight hover:underline"
      onclick={event => event.stopPropagation()}
    >
      {log.userName}
    </a>
    {#if log.userBanned}
      <span class="text-foreground-destructive shrink-0 text-sm">banned</span>
    {/if}
  </div>
{/snippet}

{#snippet ipCell(log: SubmissionLog)}
  {#if canInspectIp(log.ip)}
    <a
      href={ipInfoUrl(log.ip)}
      target="_blank"
      rel="noreferrer"
      class="bg-background-l4 text-foreground-l2 hover:text-foreground-l1 max-w-full truncate rounded-md px-2 py-1 text-xs whitespace-nowrap hover:underline"
      onclick={event => event.stopPropagation()}
    >
      <code>{log.ip}</code>
    </a>
  {:else}
    <code
      class="bg-background-l4 text-foreground-l3 max-w-full truncate rounded-md px-2 py-1 text-xs whitespace-nowrap"
    >
      {log.ip}
    </code>
  {/if}
{/snippet}

{#snippet kindBadge(kind: SubmissionLogKind)}
  <span
    class="bg-background-l4 text-foreground-l2 inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs whitespace-nowrap"
  >
    {#if kind === SubmissionLogKind.ADMIN_BOT}
      <IconRobot class="size-3.5 shrink-0" />
      <span class="truncate">Admin bot</span>
    {:else}
      <IconFlag3Filled class="size-3.5 shrink-0" />
      <span class="truncate">Flag</span>
    {/if}
  </span>
{/snippet}

{#snippet logRow(row: VirtualRow, log: SubmissionLog, index: number)}
  {@const isExpanded = expandedLogId === log.id}
  <div
    class="absolute top-0 left-0 w-full will-change-transform contain-[layout_style_paint]"
    style:height={`${row.size}px`}
    style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
  >
    <div
      class={cn(
        'grid h-full cursor-pointer grid-cols-[2.75rem_16rem_20rem_minmax(16rem,1fr)_11rem_9rem_10rem] overflow-hidden',
        isExpanded
          ? 'bg-background-l3'
          : index % 2 === 0
            ? 'bg-background-l1'
            : 'bg-background-l2/70',
        'hover:bg-background-l3/80'
      )}
      role="button"
      tabindex="0"
      aria-expanded={isExpanded}
      onclick={() => toggleLog(log.id)}
      onkeydown={event => handleRowKeydown(event, log.id)}
    >
      <div class="flex items-center justify-center">
        <button
          type="button"
          aria-label="Show submitted details"
          aria-expanded={isExpanded}
          class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex size-7 items-center justify-center rounded-md transition-colors"
          onclick={event => {
            event.stopPropagation()
            toggleLog(log.id)
          }}
        >
          <IconChevronRight class={cn('size-4 transition-transform', isExpanded && 'rotate-90')} />
        </button>
      </div>
      <div class="flex min-w-0 items-center overflow-hidden px-3 py-2">
        {@render timeCell(log)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render challengeCell(log)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render teamCell(log)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render ipCell(log)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render kindBadge(log.kind)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        <span class="text-sm">
          {@render resultText(log.result)}
        </span>
      </div>
    </div>
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
        {@render detailRow(row, allLogs[expandedLogIndex]!)}
      {:else}
        {@const index = logIndexForVirtualRow(row.index)}
        {@render logRow(row, allLogs[index]!, index)}
      {/if}
    {/each}
  </div>
{/snippet}

{#snippet logTable()}
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
          {@render filterToolbar()}
          {@render tableHeader()}
        </div>
        {#if allLogs.length === 0}
          <EmptyState
            icon={IconTableFilled}
            title={hasFilters ? 'No matching submissions' : 'No submission logs'}
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
    <title>Submission Logs | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

<div class="h-[calc(100dvh-72px)] w-full overflow-hidden px-4 pt-0 pb-4 md:px-9">
  {#if logsQuery.isPending}
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
          <p class="text-foreground-l3">{logsQuery.error?.message}</p>
        </Card.Content>
      </Card.Root>
    </div>
  {:else}
    {@render logTable()}
  {/if}
</div>
