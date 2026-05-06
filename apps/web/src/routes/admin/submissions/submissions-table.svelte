<script lang="ts">
  import {
    SubmissionKind,
    SubmissionResult,
    SubmissionSortBy,
    SubmissionSortOrder,
    SubmissionTeamStatus,
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
    useInfiniteAdminSubmissions,
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
    clearSubmissionFilters,
    clearTimeRangeFilter,
    createSubmissionFilters,
    filterOperatorLabel,
    hasSubmissionFilters,
    hasTimeRangeFilter,
    includeOperatorLabel,
    resolveTimeRangeFilter,
    setFilterMode,
    submissionFilterFingerprint,
    submissionFilterParams,
    toggleFilterOption,
    type FilterMode,
    type MultiFilter,
    type ValueFilterId,
  } from './submissions-filters'
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
    type ResultTone,
    type SortBy,
    type Submission,
    type TeamFilterOption,
  } from './submissions-utils'

  type ValueFilterOption =
    | ChallengeFilterOption
    | TeamFilterOption
    | SubmissionKind
    | SubmissionResult
    | SubmissionTeamStatus
    | CategoryFilterOption
    | DivisionFilterOption
  type FilterOptionSegmentTone = 'category' | 'categoryMuted' | 'result'
  type FilterOptionIconTone = 'category'
  type FilterOptionSegment = {
    text: string
    tone?: FilterOptionSegmentTone
  }
  type FilterOptionView = {
    textValue: string
    segments: FilterOptionSegment[]
    style?: string
    icon?: IconComponent
    iconTone?: FilterOptionIconTone
    avatar?: {
      name: string
      avatarUrl: string | null
    }
    resultTone?: ResultTone
  }
  type ValueFilterFamilySearch = {
    value: () => string
    placeholder: string
    onInput: (value: string) => void
  }
  type ValueFilterFamily = {
    id: ValueFilterId
    label: string
    pluralLabel: string
    icon: IconComponent
    menuSize: 'search' | 'narrow' | 'medium'
    chipWidth?: 'challenge' | 'team'
    searchTerms?: readonly string[]
    clear: () => void
    search?: ValueFilterFamilySearch
    options: () => readonly ValueFilterOption[]
    rootSearchOptions?: () => readonly ValueFilterOption[]
    optionKey: (option: ValueFilterOption) => string
    optionSearchValues: (option: ValueFilterOption) => readonly string[]
    optionSelected: (option: ValueFilterOption) => boolean
    toggleOption: (option: ValueFilterOption) => void
    optionView: (option: ValueFilterOption) => FilterOptionView
    loading?: () => boolean
    loadingLabel?: string
    emptyLabel: string
  }
  type TimeFilterFamily = {
    id: 'time'
    label: string
    icon: IconComponent
    searchTerms: readonly string[]
  }
  type TypedValueFilterFamily<T extends ValueFilterOption> = Omit<
    ValueFilterFamily,
    | 'options'
    | 'rootSearchOptions'
    | 'optionKey'
    | 'optionSearchValues'
    | 'optionSelected'
    | 'toggleOption'
    | 'optionView'
  > & {
    options: () => readonly T[]
    rootSearchOptions?: () => readonly T[]
    optionKey: (option: T) => string
    optionSearchValues: (option: T) => readonly string[]
    optionSelected: (option: T) => boolean
    toggleOption: (option: T) => void
    optionView: (option: T) => FilterOptionView
  }
  type RootFilterOptionMatch = {
    family: ValueFilterFamily
    key: string
    option: ValueFilterOption
  }

  const PAGE_SIZE = 100
  const ROW_HEIGHT = 48
  const ROOT_SEARCH_MATCH_LIMIT = 8
  const VALUE_FILTER_FAMILIES = [
    defineValueFilterFamily<ChallengeFilterOption>({
      id: 'challenge',
      label: 'Challenge',
      pluralLabel: 'challenges',
      icon: IconPuzzleFilled,
      menuSize: 'search',
      chipWidth: 'challenge',
      search: {
        value: () => filters.challenge.search,
        placeholder: 'Filter challenges...',
        onInput: updateChallengeSearch,
      },
      options: () => challengeOptions,
      rootSearchOptions: () => allChallengeOptions,
      optionKey: challenge => challenge.id,
      optionSearchValues: challenge => {
        const category = getCategoryConfig(challenge.category)
        return [challenge.name, challenge.category, category.name]
      },
      optionSelected: challenge =>
        filters.challenge.selected.some(item => item.id === challenge.id),
      toggleOption: toggleChallenge,
      optionView: challengeOptionView,
      clear: () => clearSearchFilter(filters.challenge),
      loading: () => challengesQuery.isPending,
      loadingLabel: 'Loading challenges...',
      emptyLabel: 'No challenges found',
    }),
    defineValueFilterFamily<TeamFilterOption>({
      id: 'team',
      label: 'Team',
      pluralLabel: 'teams',
      icon: IconUsersGroup,
      menuSize: 'search',
      chipWidth: 'team',
      search: {
        value: () => filters.team.search,
        placeholder: 'Filter teams...',
        onInput: updateTeamSearch,
      },
      options: () => teamOptions,
      rootSearchOptions: () => rootTeamOptions,
      optionKey: team => team.id,
      optionSearchValues: team => [team.name],
      optionSelected: team => filters.team.selected.some(item => item.id === team.id),
      toggleOption: toggleTeam,
      optionView: teamOptionView,
      clear: () => clearSearchFilter(filters.team),
      loading: () => teamSuggestionsQuery.isFetching && teamOptions.length === 0,
      loadingLabel: 'Loading teams...',
      emptyLabel: 'No teams found',
    }),
    defineValueFilterFamily<SubmissionKind>({
      id: 'kind',
      label: 'Kind',
      pluralLabel: 'kinds',
      icon: IconFlag3Filled,
      menuSize: 'narrow',
      options: () => KIND_FILTERS,
      optionKey: kind => kind,
      optionSearchValues: kind => [kindLabel(kind), kind],
      optionSelected: kind => filters.kind.selected.includes(kind),
      toggleOption: toggleKind,
      optionView: kindOptionView,
      clear: () => clearFilter(filters.kind),
      emptyLabel: 'No kinds found',
    }),
    defineValueFilterFamily<SubmissionResult>({
      id: 'result',
      label: 'Result',
      pluralLabel: 'results',
      icon: IconTableFilled,
      menuSize: 'medium',
      options: () => RESULT_FILTERS,
      optionKey: result => result,
      optionSearchValues: result => [resultLabel(result), result],
      optionSelected: result => filters.result.selected.includes(result),
      toggleOption: toggleResult,
      optionView: resultOptionView,
      clear: () => clearFilter(filters.result),
      emptyLabel: 'No results found',
    }),
    defineValueFilterFamily<SubmissionTeamStatus>({
      id: 'teamStatus',
      label: 'Team status',
      pluralLabel: 'statuses',
      icon: IconGavel,
      menuSize: 'medium',
      options: () => TEAM_STATUS_FILTERS,
      optionKey: status => status,
      optionSearchValues: status => [teamStatusLabel(status), status],
      optionSelected: status => filters.teamStatus.selected.includes(status),
      toggleOption: toggleTeamStatus,
      optionView: teamStatusOptionView,
      clear: () => clearFilter(filters.teamStatus),
      emptyLabel: 'No statuses found',
    }),
    defineValueFilterFamily<CategoryFilterOption>({
      id: 'category',
      label: 'Category',
      pluralLabel: 'categories',
      icon: IconLayoutListFilled,
      menuSize: 'medium',
      options: () => categoryOptions,
      optionKey: category => category.value,
      optionSearchValues: category => {
        const config = getCategoryConfig(category.value)
        return [category.label, category.value, config.name]
      },
      optionSelected: category =>
        filters.category.selected.some(item => item.value === category.value),
      toggleOption: toggleCategory,
      optionView: categoryOptionView,
      clear: () => clearFilter(filters.category),
      loading: () => challengesQuery.isPending,
      loadingLabel: 'Loading categories...',
      emptyLabel: 'No categories found',
    }),
    defineValueFilterFamily<DivisionFilterOption>({
      id: 'division',
      label: 'Division',
      pluralLabel: 'divisions',
      icon: IconShieldFilled,
      menuSize: 'medium',
      options: () => divisionOptions,
      optionKey: division => division.value,
      optionSearchValues: division => [division.label, division.value],
      optionSelected: division =>
        filters.division.selected.some(item => item.value === division.value),
      toggleOption: toggleDivision,
      optionView: divisionOptionView,
      clear: () => clearFilter(filters.division),
      emptyLabel: 'No divisions found',
    }),
  ] satisfies ValueFilterFamily[]
  const TIME_FILTER_FAMILY = {
    id: 'time',
    label: 'Time',
    icon: IconClockFilled,
    searchTerms: ['date', 'range', 'ctf', 'relative'],
  } satisfies TimeFilterFamily
  type VirtualRow = { index: number; size: number; start: number }

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

  function clearFilters() {
    clearSubmissionFilters(filters)
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

  function defineValueFilterFamily<T extends ValueFilterOption>(
    family: TypedValueFilterFamily<T>
  ): ValueFilterFamily {
    return family as unknown as ValueFilterFamily
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
    const options = family.rootSearchOptions?.() ?? family.options()

    return takeRootSearchMatches(options, option =>
      searchMatches(query, ...family.optionSearchValues(option))
    ).map(option => ({
      family,
      key: family.optionKey(option),
      option,
    }))
  }

  function rootFilterOptionKey(match: RootFilterOptionMatch) {
    return `${match.family.id}:${match.key}`
  }

  function challengeOptionView(challenge: ChallengeFilterOption): FilterOptionView {
    const category = getCategoryConfig(challenge.category)

    return {
      textValue: `${challenge.category} ${challenge.name}`,
      style: getCategoryStyle(category.color),
      segments: [
        { text: `${challenge.category} / `, tone: 'categoryMuted' },
        { text: challenge.name, tone: 'category' },
      ],
    }
  }

  function teamOptionView(team: TeamFilterOption): FilterOptionView {
    return {
      textValue: team.name,
      avatar: {
        name: team.name,
        avatarUrl: team.avatarUrl,
      },
      segments: [{ text: team.name }],
    }
  }

  function kindOptionView(kind: SubmissionKind): FilterOptionView {
    return {
      textValue: kindLabel(kind),
      icon: kind === SubmissionKind.ADMIN_BOT ? IconRobot : IconFlag3Filled,
      segments: [{ text: kindLabel(kind) }],
    }
  }

  function resultOptionView(result: SubmissionResult): FilterOptionView {
    const tone = resultTone(result)

    return {
      textValue: resultLabel(result),
      resultTone: tone,
      segments: [{ text: resultLabel(result), tone: 'result' }],
    }
  }

  function teamStatusOptionView(status: SubmissionTeamStatus): FilterOptionView {
    return {
      textValue: teamStatusLabel(status),
      icon: status === SubmissionTeamStatus.BANNED ? IconGavel : IconShieldFilled,
      segments: [{ text: teamStatusLabel(status) }],
    }
  }

  function categoryOptionView(category: CategoryFilterOption): FilterOptionView {
    const config = getCategoryConfig(category.value)

    return {
      textValue: category.label,
      style: getCategoryStyle(config.color),
      icon: config.icon,
      iconTone: 'category',
      segments: [{ text: category.label, tone: 'category' }],
    }
  }

  function divisionOptionView(division: DivisionFilterOption): FilterOptionView {
    return {
      textValue: division.label,
      segments: [{ text: division.label }],
    }
  }

  function valueFilter(family: ValueFilterFamily): MultiFilter<unknown> {
    return filters[family.id] as MultiFilter<unknown>
  }

  function clearValueFilter(family: ValueFilterFamily) {
    family.clear()
  }

  function toggleChallenge(challenge: ChallengeFilterOption) {
    toggleFilterOption(filters.challenge, challenge, item => item.id)
  }

  function toggleTeam(team: TeamFilterOption) {
    toggleFilterOption(filters.team, team, item => item.id)
  }

  function toggleKind(kind: SubmissionKind) {
    toggleFilterOption(filters.kind, kind, item => item)
  }

  function toggleResult(result: SubmissionResult) {
    toggleFilterOption(filters.result, result, item => item)
  }

  function toggleTeamStatus(status: SubmissionTeamStatus) {
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

  function toggleSubmission(submissionId: string) {
    expandedSubmissionId = expandedSubmissionId === submissionId ? null : submissionId
  }

  function handleRowKeydown(event: KeyboardEvent, submissionId: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggleSubmission(submissionId)
  }

  function isDetailRowIndex(index: number) {
    return expandedSubmissionIndex !== -1 && index === expandedSubmissionIndex + 1
  }

  function submissionIndexForVirtualRow(index: number) {
    return expandedSubmissionIndex !== -1 && index > expandedSubmissionIndex ? index - 1 : index
  }
</script>

{#snippet sortIndicator(column: SortBy)}
  {#if sortBy === column}
    {#if sortOrder === SubmissionSortOrder.ASC}
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
    class="size-1.5 shrink-0 rounded-full"
    class:bg-foreground-success={tone === 'success'}
    class:bg-foreground-yellow-l1={tone === 'warning'}
    class:bg-foreground-destructive={tone === 'danger'}
  ></span>
{/snippet}

{#snippet resultText(result: string)}
  {@const tone = resultTone(result)}
  <span
    class="inline-flex min-w-0 items-center gap-1.5 truncate whitespace-nowrap"
    class:text-foreground-success={tone === 'success'}
    class:text-foreground-yellow-l1={tone === 'warning'}
    class:text-foreground-destructive={tone === 'danger'}
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

{#snippet valueFilterOption(
  family: ValueFilterFamily,
  option: ValueFilterOption,
  showPath: boolean = false
)}
  {@const view = family.optionView(option)}
  {@const selected = family.optionSelected(option)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={showPath ? `${family.label} ${view.textValue}` : view.textValue}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    style={view.style}
    onCheckedChange={checked => {
      if (checked !== selected) family.toggleOption(option)
    }}
  >
    {#if showPath}
      {@render rootSearchPath(family)}
    {/if}
    {#if view.avatar}
      <Avatar.Root class="size-5 rounded-md">
        {#if view.avatar.avatarUrl}
          <Avatar.Image
            src={view.avatar.avatarUrl}
            alt={view.avatar.name}
            class="rounded-md object-cover"
          />
        {/if}
        <Avatar.Fallback class="rounded-md text-[9px]">
          {getInitials(view.avatar.name)}
        </Avatar.Fallback>
      </Avatar.Root>
    {/if}
    {#if view.icon}
      <view.icon
        class={cn('size-4 shrink-0', view.iconTone === 'category' && 'text-category-foreground-l1')}
      />
    {/if}
    {#if view.resultTone}
      <span
        class="size-1.5 shrink-0 rounded-full"
        class:bg-foreground-success={view.resultTone === 'success'}
        class:bg-foreground-yellow-l1={view.resultTone === 'warning'}
        class:bg-foreground-destructive={view.resultTone === 'danger'}
      ></span>
    {/if}
    <span class="min-w-0 truncate text-sm">
      {#each view.segments as segment}
        <span
          class:text-category-foreground-l1={segment.tone === 'categoryMuted'}
          class:text-category-foreground-l0={segment.tone === 'category'}
          class:text-foreground-success={segment.tone === 'result' && view.resultTone === 'success'}
          class:text-foreground-yellow-l1={segment.tone === 'result' &&
            view.resultTone === 'warning'}
          class:text-foreground-destructive={segment.tone === 'result' &&
            view.resultTone === 'danger'}
        >
          {segment.text}
        </span>
      {/each}
    </span>
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet valueFilterOptionList(family: ValueFilterFamily)}
  {@const options = family.options()}
  <div class="p-1">
    {#if family.loading?.()}
      <div class="text-foreground-l3 flex items-center gap-2 px-2 py-1.5 text-sm">
        <Spinner class="size-3.5" />
        {family.loadingLabel}
      </div>
    {:else if options.length === 0}
      <div class="text-foreground-l3 px-2 py-1.5 text-sm">{family.emptyLabel}</div>
    {:else}
      {#each options as option (family.optionKey(option))}
        {@render valueFilterOption(family, option)}
      {/each}
    {/if}
  </div>
{/snippet}

{#snippet valueFilterSelector(family: ValueFilterFamily)}
  {#if family.search}
    {@render filterSearchInput(
      family.search.value(),
      family.search.placeholder,
      family.search.onInput
    )}
    <ScrollArea
      class="min-h-0 flex-1"
      fadeSize={28}
      fadeColor="background-l4"
      scrollbarYClasses="hidden"
    >
      {@render valueFilterOptionList(family)}
    </ScrollArea>
  {:else}
    {@render valueFilterOptionList(family)}
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
      {@render valueFilterOption(match.family, match.option, true)}
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
      class="bg-background-l4 border-foreground-l4/40 z-[100] w-80 overflow-hidden border-2 !p-0 shadow-xl"
    >
      {@render filterSearchInput(rootFilterSearch, 'Search filters...', updateRootFilterSearch)}
      {#key rootFilterScrollKey}
        {#if isRootFilterSearchActive}
          <ScrollArea
            class="h-[min(29rem,calc(var(--bits-dropdown-menu-content-available-height)-2.75rem))]"
            fadeSize={28}
            fadeColor="background-l4"
            scrollbarYClasses="hidden"
          >
            {@render rootFilterSearchResults()}
          </ScrollArea>
        {:else}
          <ScrollArea
            class="max-h-[min(29rem,calc(var(--bits-dropdown-menu-content-available-height)-2.75rem))]"
            fadeSize={28}
            fadeColor="background-l4"
            scrollbarYClasses="hidden"
          >
            {@render rootFilterList()}
          </ScrollArea>
        {/if}
      {/key}
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
    {#if selected === SubmissionKind.ADMIN_BOT}
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
    {#if selected === SubmissionTeamStatus.BANNED}
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
      {@render sortHeader(SubmissionSortBy.CREATED_AT, 'Time')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionSortBy.CHALLENGE, 'Challenge')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionSortBy.TEAM, 'Team')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionSortBy.IP, 'IP')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionSortBy.KIND, 'Kind')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionSortBy.RESULT, 'Result')}
    </div>
  </div>
{/snippet}

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

{#snippet detailRow(row: VirtualRow, submission: Submission)}
  {@const entries = detailEntries(submission)}
  <div
    class="absolute top-0 left-0 w-full will-change-transform contain-[layout_style_paint]"
    style:height={`${row.size}px`}
    style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
  >
    <div class="bg-background-l3 flex h-full min-w-0 items-center gap-2 overflow-hidden px-3 pl-12">
      <span class="text-foreground-l3 shrink-0 text-sm whitespace-nowrap">Submitted</span>
      <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 whitespace-nowrap">
        {#each entries as entry (`${submission.id}:${entry.label}:${entry.value}`)}
          {@render detailPill(entry)}
        {/each}
      </div>
      <button
        type="button"
        aria-label="Close submitted details"
        class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
        onclick={() => (expandedSubmissionId = null)}
      >
        <IconX class="size-4" />
      </button>
    </div>
  </div>
{/snippet}

{#snippet timeCell(submission: Submission)}
  {@const timestamp = new Date(submission.createdAt).getTime()}
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
    <Tooltip.Content>UTC {new Date(submission.createdAt).toISOString()}</Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet challengeCell(submission: Submission)}
  {@const category = getCategoryConfig(submission.challengeCategory)}
  <a
    href="/challenges?challenge={submission.challengeId}"
    class="group flex max-w-full min-w-0 items-center overflow-hidden whitespace-nowrap"
    style={getCategoryStyle(category.color)}
    onclick={event => event.stopPropagation()}
  >
    <span class="min-w-0 truncate text-base leading-tight">
      <span class="text-category-foreground-l1">{submission.challengeCategory} /</span>
      <span class="text-category-foreground-l0 group-hover:underline"
        >{submission.challengeName}</span
      >
    </span>
  </a>
{/snippet}

{#snippet teamCell(submission: Submission)}
  <div
    class={cn(
      'flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap',
      submission.userBanned && 'opacity-70'
    )}
  >
    <Avatar.Root class="size-8 shrink-0 rounded-lg">
      {#if submission.userAvatarUrl}
        <Avatar.Image
          src={submission.userAvatarUrl}
          alt={submission.userName}
          class="rounded-lg object-cover"
        />
      {/if}
      <Avatar.Fallback class="rounded-lg text-xs"
        >{getInitials(submission.userName)}</Avatar.Fallback
      >
    </Avatar.Root>
    <a
      href="/profile/{submission.userId}"
      class="text-foreground-l1 min-w-0 truncate text-base leading-tight hover:underline"
      onclick={event => event.stopPropagation()}
    >
      {submission.userName}
    </a>
    {#if submission.userBanned}
      <span class="text-foreground-destructive shrink-0 text-sm">banned</span>
    {/if}
  </div>
{/snippet}

{#snippet ipCell(submission: Submission)}
  {#if canInspectIp(submission.ip)}
    <a
      href={ipInfoUrl(submission.ip)}
      target="_blank"
      rel="noreferrer"
      class="bg-background-l4 text-foreground-l2 hover:text-foreground-l1 max-w-full truncate rounded-md px-2 py-1 text-xs whitespace-nowrap hover:underline"
      onclick={event => event.stopPropagation()}
    >
      <code>{submission.ip}</code>
    </a>
  {:else}
    <code
      class="bg-background-l4 text-foreground-l3 max-w-full truncate rounded-md px-2 py-1 text-xs whitespace-nowrap"
    >
      {submission.ip}
    </code>
  {/if}
{/snippet}

{#snippet kindBadge(kind: SubmissionKind)}
  <span
    class="bg-background-l4 text-foreground-l2 inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs whitespace-nowrap"
  >
    {#if kind === SubmissionKind.ADMIN_BOT}
      <IconRobot class="size-3.5 shrink-0" />
      <span class="truncate">Admin bot</span>
    {:else}
      <IconFlag3Filled class="size-3.5 shrink-0" />
      <span class="truncate">Flag</span>
    {/if}
  </span>
{/snippet}

{#snippet submissionRow(row: VirtualRow, submission: Submission, index: number)}
  {@const isExpanded = expandedSubmissionId === submission.id}
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
      onclick={() => toggleSubmission(submission.id)}
      onkeydown={event => handleRowKeydown(event, submission.id)}
    >
      <div class="flex items-center justify-center">
        <button
          type="button"
          aria-label="Show submitted details"
          aria-expanded={isExpanded}
          class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex size-7 items-center justify-center rounded-md transition-colors"
          onclick={event => {
            event.stopPropagation()
            toggleSubmission(submission.id)
          }}
        >
          <IconChevronRight class={cn('size-4 transition-transform', isExpanded && 'rotate-90')} />
        </button>
      </div>
      <div class="flex min-w-0 items-center overflow-hidden px-3 py-2">
        {@render timeCell(submission)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render challengeCell(submission)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render teamCell(submission)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render ipCell(submission)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render kindBadge(submission.kind)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        <span class="text-sm">
          {@render resultText(submission.result)}
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
        {@render detailRow(row, allSubmissions[expandedSubmissionIndex]!)}
      {:else}
        {@const index = submissionIndexForVirtualRow(row.index)}
        {@render submissionRow(row, allSubmissions[index]!, index)}
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
          {@render filterToolbar()}
          {@render tableHeader()}
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
