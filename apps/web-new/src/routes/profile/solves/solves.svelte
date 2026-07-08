<script lang="ts">
  import { mergeProps } from '@zag-js/svelte'
  import {
    IconAwardFilled,
    IconCheck,
    IconChevronRight,
    IconClockFilled,
    IconCoinFilled,
    IconEyeClosed,
    IconEyeFilled,
    IconFilter,
    IconFlagFilled,
    IconFold,
    IconSearch,
    IconTrashFilled,
    IconZoomQuestionFilled,
  } from '$lib/icons'
  import Accordion from '$lib/ui/accordion.svelte'
  import Button from '$lib/ui/button.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import { getCategoryConfig, getCategoryKeyOrAlias } from '$lib/utils/categories'
  import { formatCtfOffset, formatLocalTime } from '$lib/utils/time'
  import type {
    ChallengeInfo,
    ProfileDynamicScore,
    ProfileSolve,
  } from '../analytics/analytics-data'
  import {
    buildDisplayRows,
    computeSolvesStats,
    filterRows,
    groupRowsByCategory,
    nextSortMode,
    selectEmptyState,
    sortModeLabels,
    sortRowsByMode,
    type DisplayRow,
    type SortMode,
  } from './solves-logic'

  type BloodTier = 'gold' | 'silver' | 'bronze'

  type Props = {
    challenges: ChallengeInfo[] | null | undefined
    solves: ProfileSolve[]
    dynamicScores?: ProfileDynamicScore[]
    ctfStartTime?: number | null
    showUnsolved?: boolean
    onRevoke?: (id: string, name: string) => void
    onViewSubmissions?: (id: string) => void
    revokingId?: string | null
  }

  let {
    challenges,
    solves,
    dynamicScores = [],
    ctfStartTime = null,
    showUnsolved = true,
    onRevoke,
    onViewSubmissions,
    revokingId = null,
  }: Props = $props()

  let searchQuery = $state('')
  let hideSolved = $state(false)
  let sortMode = $state<SortMode>('category')

  const displayResult = $derived(
    buildDisplayRows({ challenges, solves, dynamicScores, showUnsolved })
  )
  const filteredRows = $derived(filterRows(displayResult.rows, { search: searchQuery, hideSolved }))
  const sortedRows = $derived(sortRowsByMode(filteredRows, sortMode))
  const groups = $derived(groupRowsByCategory(filteredRows))
  const rowsByCategory = $derived(new Map(groups.map(group => [group.category, group.rows])))
  const categoryNames = $derived(groups.map(group => group.category))
  const stats = $derived(
    computeSolvesStats({
      rows: displayResult.rows,
      boardMerged: displayResult.boardMerged,
    })
  )
  const emptyState = $derived(
    selectEmptyState({
      totalRowCount: displayResult.rows.length,
      filteredRowCount: filteredRows.length,
    })
  )

  let openCategories = $state<string[]>([])
  let hasInitialized = $state(false)

  $effect.pre(() => {
    if (!hasInitialized && categoryNames.length > 0) {
      openCategories = [...categoryNames]
      hasInitialized = true
    }
  })

  const anyOpen = $derived(openCategories.length > 0)

  function toggleCollapse() {
    openCategories = anyOpen ? [] : [...categoryNames]
  }

  function cycleSort() {
    sortMode = nextSortMode(sortMode)
  }

  function bloodTierOf(bloodIndex: number | null): BloodTier | null {
    if (bloodIndex === 0) return 'gold'
    if (bloodIndex === 1) return 'silver'
    if (bloodIndex === 2) return 'bronze'
    return null
  }

  function solveTime(timestamp: number): string {
    return formatCtfOffset(timestamp, ctfStartTime) || formatLocalTime(timestamp)
  }
</script>

<profile-solves>
  <solves-header>
    <solves-stats>
      <span data-part="points">
        <strong>{stats.pointsEarned.toLocaleString()}</strong>
        {#if stats.pointsTotal !== null}
          / {stats.pointsTotal.toLocaleString()} pts
        {:else}
          pts
        {/if}
      </span>
      <span data-part="solved">
        <strong>{stats.solved.toLocaleString()}</strong>
        {#if stats.total !== null}
          / {stats.total.toLocaleString()}
        {/if}
      </span>
    </solves-stats>

    <solves-controls>
      <search-box>
        <IconSearch />
        <input
          type="search"
          value={searchQuery}
          oninput={event => (searchQuery = event.currentTarget.value)}
          placeholder="Search challenges..."
          aria-label="Search challenges"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />
      </search-box>

      <toggle-group>
        {#if sortMode === 'category'}
          <Tooltip label={anyOpen ? 'Collapse all' : 'Expand all'}>
            {#snippet children({ props })}
              <button
                {...mergeProps(props, { onclick: toggleCollapse })}
                type="button"
                data-slot="collapse"
                data-active={!anyOpen || undefined}
                aria-label={anyOpen ? 'Collapse all categories' : 'Expand all categories'}
              >
                <IconFold />
              </button>
            {/snippet}
          </Tooltip>
        {/if}

        <Tooltip label={hideSolved ? 'Show solved' : 'Hide solved'}>
          {#snippet children({ props })}
            <button
              {...mergeProps(props, { onclick: () => (hideSolved = !hideSolved) })}
              type="button"
              data-slot="hide-solved"
              data-flat={sortMode !== 'category' || undefined}
              data-active={hideSolved || undefined}
              aria-pressed={hideSolved}
              aria-label={hideSolved ? 'Show solved challenges' : 'Hide solved challenges'}
            >
              {#if hideSolved}
                <IconEyeClosed />
              {:else}
                <IconEyeFilled />
              {/if}
            </button>
          {/snippet}
        </Tooltip>

        <Tooltip label={sortModeLabels[sortMode]}>
          {#snippet children({ props })}
            <button
              {...mergeProps(props, { onclick: cycleSort })}
              type="button"
              data-slot="sort"
              aria-label={sortModeLabels[sortMode]}
            >
              {#if sortMode === 'category'}
                <IconFlagFilled />
              {:else if sortMode === 'time'}
                <IconClockFilled />
              {:else}
                <IconCoinFilled />
              {/if}
            </button>
          {/snippet}
        </Tooltip>
      </toggle-group>
    </solves-controls>
  </solves-header>

  <solves-body>
    {#if emptyState !== null}
      <EmptyState
        icon={IconZoomQuestionFilled}
        title="No challenges"
        subtitle={emptyState === 'no-matches' ? 'No matches found' : 'No challenge data available'}
      />
    {:else if sortMode === 'category'}
      <Accordion items={categoryNames} bind:value={openCategories}>
        {#snippet header({ value, props, expanded })}
          {@const config = getCategoryConfig(value)}
          {@const entries = rowsByCategory.get(value) ?? []}
          {@const staticEntries = entries.filter(entry => !entry.isDynamic)}
          {@const solvedCount = staticEntries.filter(entry => entry.isSolved).length}
          <solves-group-header data-category-color={config.color}>
            <button {...props} data-expanded={expanded || undefined}>
              <config.icon data-slot="icon" />
              <span data-slot="name">{config.name}</span>
              <span data-slot="count">
                {#if staticEntries.length > 0}
                  <strong>{solvedCount}</strong> / {staticEntries.length}
                {:else}
                  <strong>{entries.length}</strong>
                {/if}
              </span>
              <IconChevronRight data-slot="chevron" />
            </button>
          </solves-group-header>
        {/snippet}

        {#snippet content({ value, props })}
          {@const config = getCategoryConfig(value)}
          {@const entries = rowsByCategory.get(value) ?? []}
          <solves-group-body data-category-color={config.color} {...props}>
            <ul>
              {#each entries as entry (entry.id)}
                {@render row(entry)}
              {/each}
            </ul>
          </solves-group-body>
        {/snippet}
      </Accordion>
    {:else}
      <ul data-flat>
        {#each sortedRows as entry (entry.id)}
          {@render row(entry)}
        {/each}
      </ul>
    {/if}
  </solves-body>
</profile-solves>

{#snippet row(entry: DisplayRow)}
  {@const tier = bloodTierOf(entry.bloodIndex)}
  {@const config = getCategoryConfig(entry.category)}
  <li
    data-category-color={config.color}
    data-solved={entry.isSolved && !tier ? '' : undefined}
    data-blood={tier ?? undefined}
  >
    {#if tier}
      <IconAwardFilled data-indicator />
    {:else if entry.isSolved}
      <IconCheck data-indicator />
    {/if}

    <row-main>
      <span data-part="category">{getCategoryKeyOrAlias(entry.category)} /</span>
      <span data-part="name">{entry.name}</span>
    </row-main>

    <row-meta>
      {#if entry.isSolved && (onRevoke || onViewSubmissions)}
        <row-actions>
          {#if onRevoke}
            <Button
              variant="destructive"
              size="sm"
              disabled={revokingId === entry.id}
              onclick={() => onRevoke?.(entry.id, entry.name)}
            >
              {#if revokingId === entry.id}
                <Spinner />
              {:else}
                <IconTrashFilled />
              {/if}
              Revoke
            </Button>
          {/if}
          {#if onViewSubmissions}
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="View submissions for {entry.name}"
              onclick={() => onViewSubmissions?.(entry.id)}
            >
              <IconFilter />
            </Button>
          {/if}
        </row-actions>
      {/if}

      {#if entry.solvedAt !== null}
        <span data-part="time">{solveTime(entry.solvedAt)}</span>
      {/if}

      {#if entry.points !== null}
        <span data-part="points"><strong>{entry.points.toLocaleString()}</strong> pts</span>
      {/if}
    </row-meta>
  </li>
{/snippet}

<style>
  profile-solves {
    container-type: inline-size;
    container-name: solves;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  solves-header {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    gap: 0.5rem;
    padding-block: 0.5rem;
    background: var(--background-l1);
  }

  solves-stats {
    display: flex;
    justify-content: space-between;
    padding-inline: 2.25rem;
    color: var(--foreground-l5);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;

    strong {
      color: var(--foreground-l3);
      font-weight: var(--font-weight-normal);
    }
  }

  solves-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding-inline: 1.25rem;
  }

  toggle-group {
    display: flex;
    gap: 0.25rem;
    inline-size: 100%;

    @container solves (width >= 24rem) {
      inline-size: auto;
    }
  }

  search-box {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-2xs);
    min-inline-size: 0;
    block-size: 2.5rem;
    padding-inline: 0.75rem;
    color: var(--foreground-l3);
    background: var(--background-l4);
    border-radius: 20px;

    @container solves (width >= 24rem) {
      border-radius: 20px var(--radius-sm) var(--radius-sm) 20px;
    }

    &:focus-within {
      outline: 2px solid var(--ring);
      outline-offset: 1px;
    }

    :global(svg) {
      flex-shrink: 0;
      color: var(--foreground-l3);
    }
  }

  input {
    inline-size: 100%;
    min-inline-size: 0;
    background: transparent;
    border: none;
    color: var(--foreground-l0);
    outline: none;

    &::placeholder {
      color: var(--foreground-l4);
    }
  }

  toggle-group button {
    display: inline-flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    block-size: 2.5rem;
    padding-inline: 1rem;
    color: var(--foreground-l1);
    background: var(--background-l4);
    cursor: pointer;

    @container solves (width >= 24rem) {
      flex: initial;
    }

    &[data-slot='collapse'] {
      border-radius: 20px var(--radius-sm) var(--radius-sm) 20px;

      @container solves (width >= 24rem) {
        border-radius: var(--radius-sm);
      }
    }

    &[data-slot='hide-solved'][data-flat] {
      border-radius: 20px var(--radius-sm) var(--radius-sm) 20px;

      @container solves (width >= 24rem) {
        border-radius: var(--radius-sm);
      }
    }

    &[data-slot='hide-solved']:not([data-flat]) {
      border-radius: var(--radius-sm);
    }

    &[data-slot='sort'] {
      border-radius: var(--radius-sm) 20px 20px var(--radius-sm);
    }

    :global(svg) {
      font-size: 1.25rem;
    }

    &:hover {
      background: var(--background-l5);
    }

    &[data-active] {
      color: var(--foreground-accent);
      background: var(--background-accent);

      &:hover {
        background: var(--background-accent-hover);
      }
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }

  solves-body {
    flex: 1;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: none;
    padding-block-end: var(--space-s);
  }

  solves-group-header {
    position: sticky;
    inset-block-start: 0;
    z-index: 2;
    display: block;
    background: var(--background-l1);

    button {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      inline-size: 100%;
      padding: 0.5rem 0.5rem 0.5rem 0.625rem;
      text-align: start;
      color: var(--category-foreground-l1);
      background: var(--category-background-l0);
      cursor: pointer;

      &:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: -2px;
      }

      &[data-expanded] :global([data-slot='chevron']) {
        rotate: 90deg;
      }
    }

    :global([data-slot='icon']) {
      flex-shrink: 0;
      font-size: 1rem;
    }

    :global([data-slot='chevron']) {
      flex-shrink: 0;
      font-size: 1.25rem;
      transition: rotate 200ms ease;
    }

    [data-slot='name'] {
      font-size: var(--step-0);
    }

    [data-slot='count'] {
      margin-inline-start: auto;
      color: var(--category-foreground-l1);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;

      strong {
        color: var(--category-foreground-l0);
        font-weight: var(--font-weight-normal);
      }
    }
  }

  solves-group-body {
    display: block;
    background: var(--category-background-l1);
  }

  ul {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    inline-size: 100%;
    padding: 0.5rem 2.25rem;
    background: var(--category-background-l1);
    --edge-soft: color-mix(in srgb, var(--edge-color, transparent) 20%, transparent);

    &[data-solved] {
      --edge-color: var(--foreground-success);
    }

    &[data-blood='gold'] {
      --edge-color: var(--foreground-gold-l0);
    }

    &[data-blood='silver'] {
      --edge-color: var(--foreground-silver-l0);
    }

    &[data-blood='bronze'] {
      --edge-color: var(--foreground-bronze-l0);
    }

    &[data-solved]::before,
    &[data-blood]::before {
      content: '';
      position: absolute;
      inset-block: 0;
      inset-inline-start: 0;
      inline-size: 9rem;
      pointer-events: none;
      background: linear-gradient(to right, var(--edge-soft), transparent);
    }

    :global(svg[data-indicator]) {
      position: absolute;
      inset-block-start: 50%;
      inset-inline-start: 0.5rem;
      translate: 0 -50%;
      font-size: 1.25rem;
      color: var(--edge-color);
    }
  }

  ul[data-flat] li {
    background: var(--background-l1);
  }

  row-main {
    position: relative;
    z-index: 1;
    display: flex;
    gap: var(--space-3xs);
    min-inline-size: 0;
    overflow: hidden;
    white-space: nowrap;
    font-size: var(--step-0);
  }

  [data-part='category'] {
    flex-shrink: 0;
    color: var(--category-foreground-l1);
  }

  [data-part='name'] {
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--category-foreground-l0);
  }

  row-meta {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-xs);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;

    [data-part='points'] {
      color: var(--category-foreground-l1);

      strong {
        color: var(--category-foreground-l0);
        font-weight: var(--font-weight-normal);
      }
    }
  }

  row-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
  }

  [data-part='time'] {
    color: var(--category-foreground-l1);
    opacity: 0.75;
  }

  @container solves (width >= 30rem) {
    li {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-m);
    }

    row-main {
      flex: 1;
    }
  }
</style>
