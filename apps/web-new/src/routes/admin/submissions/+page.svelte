<!--
  Admin submissions audit table (R27-R30, AE7). A read-only, server-sorted,
  infinitely-paged stream over POST /v2/admin/submissions with seven value
  filter families plus a time-range family, an expandable per-row detail row,
  and deep-link pre-filters. No polling: data refetches only on filter, sort,
  or pagination changes. Access is already gated by the admin +layout
  (challsRead), which this read surface also accepts.
-->
<script lang="ts">
  import { SubmissionSortBy } from '@rctf/types'
  import { page } from '$app/state'
  import type { MultiFilter } from '$lib/filters/core'
  import FilterBar from '$lib/filters/filter-bar.svelte'
  import { uniqueTeamOptions, type ValueFilterFamily } from '$lib/filters/ui'
  import IconTableFilled from '$lib/icons/icon-table-filled.svelte'
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
  const submissions = $derived(
    (submissionsQuery.data?.pages.flatMap(page => page.submissions) ?? []) as Submission[]
  )
  const showError = $derived(!!submissionsQuery.error && !submissionsQuery.data)

  // Team options come from a server search (name/email) run once the query is at
  // least two characters; the selected teams are always merged in so a chosen
  // team stays visible even after the search box is cleared.
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
    const query = filters.challenge.search.trim().toLowerCase()
    if (!query) return allChallengeOptions
    return allChallengeOptions.filter(challenge => {
      const haystack =
        `${challenge.name} ${challenge.category} ${getCategoryConfig(challenge.category).name}`.toLowerCase()
      return haystack.includes(query)
    })
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

  // Deep-link: /admin/submissions?team=<id>&challenge=<id> pre-applies include
  // filters once each side resolves (team via its admin detail query, challenge
  // via the admin challenges list). The latch is plain control-flow state (not
  // $state), like the shell's load-more latch: it records which sides have fired
  // so a refetch never re-applies a filter the admin has since edited, and a
  // non-reactive read keeps the write from re-triggering the effect.
  const deepLinkTeamId = $derived(page.url.searchParams.get('team'))
  const deepLinkChallengeId = $derived(page.url.searchParams.get('challenge'))
  const deepLinkTeamQuery = useAdminUser(() => deepLinkTeamId)
  let deepLinkLatch = createDeepLinkLatch()

  $effect(() => {
    const team = deepLinkTeamId
      ? deepLinkTeamQuery.data
        ? {
            id: deepLinkTeamQuery.data.id,
            name: deepLinkTeamQuery.data.name,
            avatarUrl: deepLinkTeamQuery.data.avatarUrl,
          }
        : null
      : undefined
    const challenge = deepLinkChallengeId
      ? (allChallengeOptions.find(option => option.id === deepLinkChallengeId) ?? null)
      : undefined

    deepLinkLatch = applyDeepLinkFilters(filters, deepLinkLatch, { team, challenge })
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
    <AdminTable
      rows={submissions}
      rowHeight={48}
      overscan={6}
      {fingerprint}
      hasNextPage={submissionsQuery.hasNextPage ?? false}
      isFetchingNextPage={submissionsQuery.isFetchingNextPage}
      onLoadMore={() => submissionsQuery.fetchNextPage()}
      filtered={hasFilters}
      bind:expandedId
      expandable
      rowId={submission => submission.id}
      minTableWidth={296}
    >
      {#snippet toolbar()}
        <FilterBar
          {families}
          {filterFor}
          timeFilter={filters.time}
          ctfStartTime={ctfStartTime ?? null}
          hasActiveFilters={hasFilters}
          onClearAll={() => clearSubmissionFilters(filters)}
          fetching={submissionsQuery.isFetching}
        />
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
  {/if}
</submissions-page>

<style>
  /* The app shell only guarantees min-block-size: 100dvh, so bound the height
     here — the table shell scrolls internally. */
  submissions-page {
    display: flex;
    flex-direction: column;
    block-size: calc(100dvh - var(--header-height));
    min-block-size: 0;
    inline-size: 100%;
    padding: 0 var(--space-m) var(--space-m);
    overflow: hidden;
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
