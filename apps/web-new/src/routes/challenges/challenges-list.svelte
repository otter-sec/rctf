<!--
  Master list for the challenges page: category accordion + toolbar. Owns the
  session search text and the persisted hide-solved / collapsed-category
  preferences. The accordion is controlled: its open set is computed from the
  persisted collapsed set, with search (all open) and the deep-link target always
  forced open transiently — those forced expansions are never written back.
-->
<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import IconChevronDown from '$lib/icons/icon-chevron-down.svelte'
  import IconZoomQuestionFilled from '$lib/icons/icon-zoom-question-filled.svelte'
  import Accordion from '$lib/ui/accordion.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import { getCategoryConfig } from '$lib/utils/categories'
  import ChallengesListHeader from './challenges-list-header.svelte'
  import ChallengesListItem from './challenges-list-item.svelte'
  import {
    computeStats,
    deriveAccordionValue,
    filterChallenges,
    groupChallenges,
    resolveCategory,
  } from './challenges-list-logic'
  import { loadPreferences, savePreferences } from './challenges-preferences'

  interface Props {
    challenges: Challenge[]
    solvedIds: ReadonlySet<string>
    bloodIds: { gold: Set<string>; silver: Set<string>; bronze: Set<string> }
    selectedId: string | null
    onSelect: (challenge: Challenge) => void
    deepLinkTarget: string | null
  }

  let { challenges, solvedIds, bloodIds, selectedId, onSelect, deepLinkTarget }: Props = $props()

  const initialPrefs = loadPreferences()
  let searchQuery = $state('')
  let hideSolved = $state(initialPrefs.hideSolved)
  let collapsedCategories = $state<string[]>(initialPrefs.collapsedCategories)

  const searching = $derived(searchQuery.trim().length > 0)

  // Search always applies; hide-solved excludes solved rows except the deep-link
  // target, which must render so the page can scroll it into view (KTD-5).
  const visibleChallenges = $derived.by(() => {
    const searched = filterChallenges(challenges, {
      query: searchQuery,
      hideSolved: false,
      solvedIds,
    })
    if (!hideSolved) return searched
    return searched.filter(
      challenge => challenge.id === deepLinkTarget || !solvedIds.has(challenge.id)
    )
  })

  const groups = $derived(groupChallenges(visibleChallenges))
  const groupByCategory = $derived(new Map(groups.map(group => [group.category, group])))
  const allCategories = $derived(groups.map(group => group.category))

  const deepLinkCategory = $derived.by(() => {
    if (!deepLinkTarget) return null
    const target = challenges.find(challenge => challenge.id === deepLinkTarget)
    return target ? resolveCategory(target.category) : null
  })

  const accordionValue = $derived(
    deriveAccordionValue({ allCategories, collapsedCategories, searching, deepLinkCategory })
  )
  const anyOpen = $derived(accordionValue.length > 0)

  const stats = $derived(computeStats(challenges, solvedIds))

  const emptySubtitle = $derived.by(() => {
    if (searching && hideSolved) return 'Try a different search or show solved challenges'
    if (searching) return 'Try a different search term'
    if (hideSolved) return 'All challenges have been solved!'
    return 'No challenges available'
  })

  function bloodTierOf(id: string): 'gold' | 'silver' | 'bronze' | null {
    if (bloodIds.gold.has(id)) return 'gold'
    if (bloodIds.silver.has(id)) return 'silver'
    if (bloodIds.bronze.has(id)) return 'bronze'
    return null
  }

  function toggleHideSolved() {
    hideSolved = !hideSolved
    savePreferences({ hideSolved, collapsedCategories })
  }

  // Reconcile only the categories whose open state actually changed, so a
  // search/deep-link forced-open category is never written into the collapsed
  // set just because the user toggled a different one.
  function handleValueChange(open: string[]) {
    if (searching) return
    const openSet = new Set(open)
    const before = new Set(accordionValue)
    const next = [...collapsedCategories]
    let changed = false
    for (const category of allCategories) {
      const nowOpen = openSet.has(category)
      if (nowOpen === before.has(category)) continue
      const index = next.indexOf(category)
      if (nowOpen && index !== -1) {
        next.splice(index, 1)
        changed = true
      } else if (!nowOpen && index === -1) {
        next.push(category)
        changed = true
      }
    }
    if (changed) {
      collapsedCategories = next
      savePreferences({ hideSolved, collapsedCategories: next })
    }
  }

  function toggleCollapseAll() {
    const rendered = new Set(allCategories)
    const preserved = collapsedCategories.filter(category => !rendered.has(category))
    const next = anyOpen ? [...preserved, ...allCategories] : preserved
    const deduped = [...new Set(next)]
    collapsedCategories = deduped
    savePreferences({ hideSolved, collapsedCategories: deduped })
  }
</script>

<challenges-list>
  <ChallengesListHeader
    pointsEarned={stats.pointsEarned}
    pointsTotal={stats.pointsTotal}
    solvedCount={stats.solvedCount}
    totalCount={stats.totalCount}
    {searchQuery}
    {hideSolved}
    {anyOpen}
    onSearchChange={value => (searchQuery = value)}
    onToggleHideSolved={toggleHideSolved}
    onToggleCollapse={toggleCollapseAll}
  />

  <list-scroll>
    {#if groups.length === 0}
      <EmptyState
        icon={IconZoomQuestionFilled}
        title="No challenges found"
        subtitle={emptySubtitle}
      />
    {:else}
      <Accordion items={allCategories} value={accordionValue} onValueChange={handleValueChange}>
        {#snippet header({ value, props, expanded })}
          {@const config = getCategoryConfig(value)}
          {@const entries = groupByCategory.get(value)?.challenges ?? []}
          {@const solvedInCategory = entries.filter(c => solvedIds.has(c.id)).length}
          <challenges-list-group-header data-category-color={config.color}>
            <button {...props} data-expanded={expanded || undefined}>
              <config.icon data-slot="icon" />
              <span data-slot="name">{config.name}</span>
              <span data-slot="count">
                <strong>{solvedInCategory}</strong> / {entries.length}
              </span>
              <IconChevronDown data-slot="chevron" />
            </button>
          </challenges-list-group-header>
        {/snippet}

        {#snippet content({ value, props })}
          {@const config = getCategoryConfig(value)}
          {@const entries = groupByCategory.get(value)?.challenges ?? []}
          <challenges-list-group-body data-category-color={config.color} {...props}>
            <ul>
              {#each entries as challenge (challenge.id)}
                <ChallengesListItem
                  {challenge}
                  category={value}
                  solved={solvedIds.has(challenge.id)}
                  bloodTier={bloodTierOf(challenge.id)}
                  selected={selectedId === challenge.id}
                  onSelect={() => onSelect(challenge)}
                />
              {/each}
            </ul>
          </challenges-list-group-body>
        {/snippet}
      </Accordion>
    {/if}
  </list-scroll>
</challenges-list>

<style>
  challenges-list {
    container-type: inline-size;
    container-name: challenges-list;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  list-scroll {
    flex: 1;
    min-block-size: 0;
    overflow-y: auto;
    padding-block-end: var(--space-s);
  }

  challenges-list-group-header {
    position: sticky;
    inset-block-start: 0;
    /* Above the rows' own z-index: 1 layers so nothing shows through. */
    z-index: 2;
    display: block;
    background: var(--background-l1);

    /* 0.625rem start padding + 1rem icon + 0.625rem gap puts the name on the
       2.25rem alignment rail. */
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
        rotate: 0deg;
      }
    }

    :global([data-slot='icon']) {
      flex-shrink: 0;
      font-size: 1rem;
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

    :global([data-slot='chevron']) {
      flex-shrink: 0;
      font-size: 1rem;
      color: var(--category-foreground-l1);
      rotate: -90deg;
      transition: rotate 150ms ease;
    }
  }

  challenges-list-group-body {
    display: block;
    background: var(--category-background-l1);

    ul {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
  }
</style>
