<script lang="ts">
  import { Permissions, type AdminChallenge } from '@rctf/types'
  import { mergeProps } from '@zag-js/svelte'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import { createScrollGeometry, deriveEdgeFades } from '$lib/components/scroll-geometry.svelte'
  import {
    IconChevronDown,
    IconFold,
    IconLibraryPlusFilled,
    IconSearch,
    IconZoomQuestionFilled,
  } from '$lib/icons'
  import { useCurrentUser } from '$lib/query/user'
  import Accordion from '$lib/ui/accordion.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import { getCategoryConfig, getCategoryKeyOrAlias } from '$lib/utils/categories'
  import { hasPermissions } from '$lib/utils/permissions'
  import AdminChallengesListItem from './list-item.svelte'
  import { accordionValue, filterChallenges, groupChallenges } from './list-logic'

  interface Props {
    challenges: AdminChallenge[]
    selectedId: string | null
    isCreatingNew: boolean
    onSelect: (challenge: AdminChallenge) => void
    onCreateNew: () => void
  }

  let { challenges, selectedId, isCreatingNew, onSelect, onCreateNew }: Props = $props()

  const userQuery = useCurrentUser()
  const canWrite = $derived(hasPermissions(userQuery.data, Permissions.challsWrite))

  let searchQuery = $state('')
  let collapsed = $state<string[]>([])

  const searching = $derived(searchQuery.trim().length > 0)

  const filtered = $derived(filterChallenges(challenges, searchQuery))
  const groups = $derived(groupChallenges(filtered))
  const groupByCategory = $derived(new Map(groups.map(group => [group.category, group])))
  const categories = $derived(groups.map(group => group.category))

  const value = $derived(accordionValue(groups, collapsed, searching))
  const anyOpen = $derived(value.length > 0)

  const stats = $derived({
    challenges: challenges.length,
    categories: new Set(challenges.map(c => getCategoryKeyOrAlias(c.category))).size,
  })

  const emptySubtitle = $derived(
    searching ? 'Try a different search term' : 'Create your first challenge to get started'
  )

  function handleValueChange(open: string[]) {
    if (searching) return
    collapsed = categories.filter(category => !open.includes(category))
  }

  function toggleCollapseAll() {
    collapsed = anyOpen ? [...categories] : []
  }

  let listEl = $state<HTMLElement | null>(null)
  const fades = deriveEdgeFades(createScrollGeometry(() => listEl))
</script>

<admin-challenges-list>
  <list-header>
    <list-stats>
      <span data-part="stat">
        <strong>{stats.challenges.toLocaleString()}</strong>
        challenge{stats.challenges === 1 ? '' : 's'}
      </span>
      <span data-part="stat">
        <strong>{stats.categories.toLocaleString()}</strong>
        categor{stats.categories === 1 ? 'y' : 'ies'}
      </span>
    </list-stats>

    <list-controls>
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

      <toggle-group data-can-write={canWrite || undefined}>
        <Tooltip label={anyOpen ? 'Collapse all' : 'Expand all'}>
          {#snippet children({ props })}
            <button
              {...mergeProps(props, { onclick: toggleCollapseAll })}
              type="button"
              data-slot="collapse"
              data-active={!anyOpen || undefined}
              aria-label={anyOpen ? 'Collapse all categories' : 'Expand all categories'}
            >
              <IconFold />
            </button>
          {/snippet}
        </Tooltip>

        {#if canWrite}
          <Tooltip label="New challenge">
            {#snippet children({ props })}
              <button
                {...mergeProps(props, { onclick: onCreateNew })}
                type="button"
                data-slot="new"
                data-active={isCreatingNew || undefined}
                aria-label="New challenge"
              >
                <IconLibraryPlusFilled />
              </button>
            {/snippet}
          </Tooltip>
        {/if}
      </toggle-group>
    </list-controls>
  </list-header>

  <list-viewport>
    <list-scroll bind:this={listEl}>
      {#if groups.length === 0}
        <EmptyState
          icon={IconZoomQuestionFilled}
          title={searching ? 'No challenges found' : 'No challenges yet'}
          subtitle={emptySubtitle}
        />
      {:else}
        <Accordion items={categories} {value} onValueChange={handleValueChange}>
          {#snippet header({ value: category, props, expanded })}
            {@const config = getCategoryConfig(category)}
            {@const entries = groupByCategory.get(category)?.challenges ?? []}
            <group-header data-category-color={config.color}>
              <button {...props} data-expanded={expanded || undefined}>
                <config.icon data-slot="icon" />
                <span data-slot="name">{config.name}</span>
                <span data-slot="count">{entries.length}</span>
                <IconChevronDown data-slot="chevron" />
              </button>
            </group-header>
          {/snippet}

          {#snippet content({ value: category, props })}
            {@const config = getCategoryConfig(category)}
            {@const entries = groupByCategory.get(category)?.challenges ?? []}
            <group-body data-category-color={config.color} {...props}>
              <ul>
                {#each entries as challenge (challenge.id)}
                  <AdminChallengesListItem
                    {challenge}
                    {category}
                    selected={selectedId === challenge.id}
                    onSelect={() => onSelect(challenge)}
                  />
                {/each}
              </ul>
            </group-body>
          {/snippet}
        </Accordion>
      {/if}
    </list-scroll>
    <EdgeFades top={fades.top} bottom={fades.bottom} />
  </list-viewport>
</admin-challenges-list>

<style>
  admin-challenges-list {
    container-type: inline-size;
    container-name: admin-challenges-list;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  list-header {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    gap: 0.5rem;
    padding-block: 0.5rem;
  }

  list-stats {
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

  list-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding-inline: 1.25rem;
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

    @container admin-challenges-list (width >= 24rem) {
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

  toggle-group {
    display: flex;
    gap: 0.25rem;
    inline-size: 100%;

    @container admin-challenges-list (width >= 24rem) {
      inline-size: auto;
    }
  }

  button {
    display: inline-flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    block-size: 2.5rem;
    padding-inline: 1rem;
    color: var(--foreground-l1);
    background: var(--background-l4);
    cursor: pointer;

    @container admin-challenges-list (width >= 24rem) {
      flex: initial;
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

    :global(svg) {
      font-size: 1.25rem;
    }
  }

  [data-slot='collapse'] {
    border-radius: 20px;
  }

  toggle-group[data-can-write] [data-slot='collapse'] {
    border-radius: 20px var(--radius-sm) var(--radius-sm) 20px;
  }

  [data-slot='new'] {
    border-radius: var(--radius-sm) 20px 20px var(--radius-sm);
  }

  @container admin-challenges-list (width >= 24rem) {
    [data-slot='collapse'] {
      border-radius: var(--radius-sm) 20px 20px var(--radius-sm);
    }

    toggle-group[data-can-write] [data-slot='collapse'] {
      border-radius: var(--radius-sm);
    }

    [data-slot='new'] {
      border-radius: var(--radius-sm) 20px 20px var(--radius-sm);
    }
  }

  list-viewport {
    --fade-color: var(--background-l1);

    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  list-scroll {
    flex: 1;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: none;
    padding-block-end: var(--space-s);
  }

  group-header {
    position: sticky;
    inset-block-start: 0;
    z-index: 2;
    display: block;
    background: var(--background-l1);

    button {
      display: flex;
      flex: initial;
      align-items: center;
      gap: 0.625rem;
      inline-size: 100%;
      block-size: auto;
      padding: 0.5rem 0.5rem 0.5rem 0.625rem;
      text-align: start;
      color: var(--category-foreground-l1);
      background: var(--category-background-l0);

      &:hover {
        background: var(--category-background-l0);
      }

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
      color: var(--category-foreground-l0);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    :global([data-slot='chevron']) {
      flex-shrink: 0;
      font-size: 1rem;
      color: var(--category-foreground-l1);
      rotate: -90deg;
      transition: rotate 150ms ease;
    }
  }

  group-body {
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
