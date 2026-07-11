<script lang="ts">
  import { SubmissionSortBy } from '@rctf/types'
  import { page } from '$app/state'
  import type { MultiFilter } from '$lib/filters/core'
  import FilterBar from '$lib/filters/filter-bar.svelte'
  import {
    normalizeSearchText,
    searchMatches,
    uniqueTeamOptions,
    type ValueFilterFamily,
  } from '$lib/filters/ui'
  import { IconTableFilled } from '$lib/icons'
  import {
    useAdminChallenges,
    useAdminSubmissionsInfinite,
    useAdminUser,
    useAdminUsersInfinite,
  } from '$lib/query/admin'
  import { useClientConfig } from '$lib/query/config'
  import Card from '$lib/ui/card.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { getCategoryConfig } from '$lib/utils/categories'
  import { nextSort } from '../admin-table-logic'
  import AdminTable from '../admin-table.svelte'
  import { createSubmissionValueFilterFamilies } from './submissions-families'
  import {
    applyDeepLinkFilters,
    buildSubmissionsBody,
    clearSubmissionFilters,
    createDeepLinkLatch,
    createSubmissionFilters,
    hasSubmissionFilters,
    initialSubmissionSort,
    SUBMISSION_SORT_DEFAULTS,
    submissionQueryFingerprint,
    type ChallengeOption,
    type Submission,
    type SubmissionFilters,
    type SubmissionSort,
  } from './submissions-model'
  import SubmissionsDetailRow from './table/submissions-detail-row.svelte'
  import SubmissionsHeader from './table/submissions-header.svelte'
  import SubmissionsRow from './table/submissions-row.svelte'

  const configQuery = useClientConfig()
  const challengesQuery = useAdminChallenges()

  const ctfName = $derived(configQuery.data?.ctfName)
  const ctfStartTime = $derived(configQuery.data?.startTime)

  let filters = $state<SubmissionFilters>(createSubmissionFilters())
  let sort = $state<SubmissionSort>(initialSubmissionSort())
  let expandedId = $state<string | null>(null)

  const hasFilters = $derived(hasSubmissionFilters(filters))
  const fingerprint = $derived(submissionQueryFingerprint(filters, sort))

  const submissionsQuery = useAdminSubmissionsInfinite(() =>
    buildSubmissionsBody(filters, sort, ctfStartTime)
  )

  const revealAfterLoading = submissionsQuery.isPending
  const submissions = $derived(
    (submissionsQuery.data?.pages.flatMap(page => page.submissions) ?? []) as Submission[]
  )
  const showError = $derived(!!submissionsQuery.error && !submissionsQuery.data)

  const teamSearch = $derived(filters.team.search.trim())
  const teamSuggestionsQuery = useAdminUsersInfinite(
    () => ({ limit: 16, search: teamSearch.length >= 2 ? teamSearch : undefined }),
    () => teamSearch.length >= 2
  )
  const teamSuggestions = $derived(
    teamSuggestionsQuery.data?.pages.flatMap(page => page.users) ?? []
  )
  const teamOptions = $derived(uniqueTeamOptions([...filters.team.selected, ...teamSuggestions]))

  const allChallengeOptions = $derived<ChallengeOption[]>(
    (challengesQuery.data ?? []).map(challenge => ({
      id: challenge.id,
      name: challenge.name,
      category: challenge.category,
    }))
  )
  const challengeOptions = $derived.by(() => {
    const query = normalizeSearchText(filters.challenge.search)
    if (!query) return allChallengeOptions
    return allChallengeOptions.filter(challenge =>
      searchMatches(
        query,
        `${challenge.name} ${challenge.category} ${getCategoryConfig(challenge.category).name}`
      )
    )
  })
  const categoryOptions = $derived.by(() => {
    const categories = new Set(
      (challengesQuery.data ?? []).map(challenge => challenge.category.trim()).filter(Boolean)
    )
    return [...categories]
      .sort((a, b) => a.localeCompare(b))
      .map(category => ({ value: category, label: category }))
  })
  const divisionOptions = $derived(
    Object.entries(configQuery.data?.divisions ?? {}).map(([value, label]) => ({
      value,
      label,
    }))
  )

  const families = $derived(
    createSubmissionValueFilterFamilies({
      filters,
      challengeOptions,
      allChallengeOptions,
      teamOptions,
      categoryOptions,
      divisionOptions,
      challengesLoading: () => challengesQuery.isPending,
      teamOptionsLoading: () => teamSuggestionsQuery.isFetching && teamOptions.length === 0,
    })
  )
  const filterFor = (family: ValueFilterFamily): MultiFilter<unknown> =>
    filters[family.id as keyof SubmissionFilters] as MultiFilter<unknown>

  const deepLinkTeamId = $derived(page.url.searchParams.get('team'))
  const deepLinkChallengeId = $derived(page.url.searchParams.get('challenge'))
  const deepLinkTeamQuery = useAdminUser(() => deepLinkTeamId)
  let deepLinkLatch = createDeepLinkLatch()

  $effect(() => {
    const team =
      deepLinkTeamQuery.data?.id === deepLinkTeamId
        ? {
            id: deepLinkTeamQuery.data.id,
            name: deepLinkTeamQuery.data.name,
            avatarUrl: deepLinkTeamQuery.data.avatarUrl,
          }
        : null
    const challenge = allChallengeOptions.find(option => option.id === deepLinkChallengeId) ?? null

    deepLinkLatch = applyDeepLinkFilters(filters, deepLinkLatch, {
      team: { id: deepLinkTeamId, option: team },
      challenge: { id: deepLinkChallengeId, option: challenge },
    })
  })

  function onSort(column: SubmissionSortBy) {
    sort = nextSort(sort, column, SUBMISSION_SORT_DEFAULTS)
  }

  function toggleExpanded(id: string) {
    expandedId = expandedId === id ? null : id
  }
</script>

<svelte:head>
  {#if ctfName}
    <title>Submissions | {ctfName}</title>
  {/if}
</svelte:head>

<submissions-page>
  {#if submissionsQuery.isPending}
    <page-status>
      <Spinner />
    </page-status>
  {:else if showError}
    <page-status>
      <Card title="Submissions">
        <p>{submissionsQuery.error?.message}</p>
      </Card>
    </page-status>
  {:else}
    <submissions-reveal data-reveal={revealAfterLoading || undefined}>
      <AdminTable
        rows={submissions}
        rowHeight={48}
        headerHeight={42}
        overscan={6}
        {fingerprint}
        hasNextPage={submissionsQuery.hasNextPage ?? false}
        isFetchingNextPage={submissionsQuery.isFetchingNextPage}
        onLoadMore={() => submissionsQuery.fetchNextPage()}
        filtered={hasFilters}
        bind:expandedId
        expandable
        rowId={submission => submission.id}
        minTableWidth={1180}
      >
        {#snippet toolbar()}
          <submissions-toolbar>
            <FilterBar
              {families}
              {filterFor}
              timeFilter={filters.time}
              ctfStartTime={ctfStartTime ?? null}
              hasActiveFilters={hasFilters}
              onClearAll={() => clearSubmissionFilters(filters)}
              fetching={submissionsQuery.isFetching}
            />
          </submissions-toolbar>
        {/snippet}

        {#snippet header()}
          <SubmissionsHeader {sort} {onSort} />
        {/snippet}

        {#snippet row(submission, index)}
          <SubmissionsRow
            {submission}
            {index}
            expanded={expandedId === submission.id}
            {ctfStartTime}
            onToggle={toggleExpanded}
          />
        {/snippet}

        {#snippet detailRow(submission)}
          <SubmissionsDetailRow {submission} onClose={() => (expandedId = null)} />
        {/snippet}

        {#snippet emptyState(filtered)}
          <EmptyState
            icon={IconTableFilled}
            title={filtered ? 'No matching submissions' : 'No submissions'}
            subtitle={filtered
              ? 'Adjust or clear the filters to broaden the audit trail.'
              : 'Submission IPs will appear here once teams submit flags or admin bot jobs'}
          />
        {/snippet}
      </AdminTable>
    </submissions-reveal>
  {/if}
</submissions-page>

<style>
  submissions-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-2xs);
    border-block-end: 2px solid var(--border);
  }

  submissions-reveal {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  submissions-page {
    display: flex;
    flex-direction: column;
    block-size: calc(100dvh - var(--header-height));
    min-block-size: 0;
    inline-size: 100%;
    padding: 0 1rem 1rem;
    overflow: hidden;

    @media (width >= 48rem) {
      padding-inline: 2.25rem;
    }
  }

  page-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-l);

    :global(ui-card) {
      inline-size: 100%;
      max-inline-size: 28rem;
    }

    p {
      color: var(--foreground-l3);
    }
  }
</style>
