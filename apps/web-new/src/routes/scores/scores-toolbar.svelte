<script lang="ts">
  import IconChevronDown from '$lib/icons/icon-chevron-down.svelte'
  import IconLayoutListFilled from '$lib/icons/icon-layout-list-filled.svelte'
  import IconSortAscendingNumbers from '$lib/icons/icon-sort-ascending-numbers.svelte'
  import IconSortDescendingShapesFilled from '$lib/icons/icon-sort-descending-shapes-filled.svelte'
  import IconTableFilled from '$lib/icons/icon-table-filled.svelte'
  import IconUsersGroup from '$lib/icons/icon-users-group.svelte'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import type { Component } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import type { ScoresData } from './scores-data.svelte'
  import { moveRovingIndex } from './scores-toolbar-roving'
  import ScoresSearch from './scores-toolbar-search.svelte'
  import type { ScoresUrlState } from './scores-url-state.svelte'

  interface Props {
    data: ScoresData
    urlState: ScoresUrlState
    divisions: Record<string, string>
  }

  let { data, urlState, divisions }: Props = $props()

  const ALL_DIVISIONS = '__all__'

  const showDivision = $derived(Object.keys(divisions).length > 1)
  const divisionLabel = $derived(
    urlState.division ? (divisions[urlState.division] ?? urlState.division) : 'All divisions'
  )
  const divisionItems = $derived<MenuItem[]>([
    {
      value: ALL_DIVISIONS,
      label: 'All divisions',
      checked: !urlState.division,
      onSelect: () => urlState.setDivision(undefined),
    },
    ...Object.entries(divisions).map(([value, label]) => ({
      value,
      label,
      checked: urlState.division === value,
      onSelect: () => urlState.setDivision(value),
    })),
  ])

  const searchPending = $derived(data.isBoardFetching && urlState.searchInput.length > 0)

  const viewOptions = [
    { value: 'challenges', icon: IconTableFilled, label: 'Challenges' },
    { value: 'categories', icon: IconLayoutListFilled, label: 'Categories' },
  ] as const

  const sortOptions = [
    { value: 'categories', icon: IconSortDescendingShapesFilled, label: 'Category' },
    { value: 'solves', icon: IconSortAscendingNumbers, label: 'Difficulty' },
  ] as const

  // Single tab stop with ArrowLeft/ArrowRight + Home/End moving focus among the
  // view/sort buttons (R21) — the roving group is the icon-button controls, not
  // the search input or division trigger, matching the old app's toolbar scope.
  const rovingFocus: Attachment<HTMLElement> = node => {
    const items = () => [...node.querySelectorAll<HTMLElement>('[data-roving]')]

    const setTabStops = (active: HTMLElement | null) => {
      const list = items()
      const current = active && list.includes(active) ? active : list[0]
      for (const item of list) item.tabIndex = item === current ? 0 : -1
    }

    const onKeydown = (event: KeyboardEvent) => {
      const list = items()
      const active = document.activeElement
      const current = list.indexOf(active as HTMLElement)
      if (current === -1) return
      const next = moveRovingIndex(current, list.length, event.key)
      if (next === null) return
      event.preventDefault()
      list[next]?.focus()
    }

    const onFocusin = (event: FocusEvent) => setTabStops(event.target as HTMLElement)

    setTabStops(null)
    node.addEventListener('keydown', onKeydown)
    node.addEventListener('focusin', onFocusin)
    // The sort group mounts/unmounts with the view mode; re-sync the tab stop.
    const observer = new MutationObserver(() => setTabStops(document.activeElement as HTMLElement))
    observer.observe(node, { childList: true, subtree: true })

    return () => {
      node.removeEventListener('keydown', onKeydown)
      node.removeEventListener('focusin', onFocusin)
      observer.disconnect()
    }
  }
</script>

{#snippet iconToggle(label: string, Icon: Component, active: boolean, onclick: () => void)}
  <Tooltip {label}>
    {#snippet children({ props })}
      <button
        {...props}
        data-roving
        type="button"
        aria-label={label}
        aria-pressed={active}
        data-active={active || undefined}
        {onclick}
      >
        <Icon />
      </button>
    {/snippet}
  </Tooltip>
{/snippet}

<scores-toolbar>
  <score-title>Scoreboard</score-title>

  <score-controls role="toolbar" aria-label="Scoreboard display controls" {@attach rovingFocus}>
    <control-group>
      <span>View</span>
      <button-row>
        {#each viewOptions as option (option.value)}
          {@render iconToggle(option.label, option.icon, urlState.viewMode === option.value, () =>
            urlState.setViewMode(option.value)
          )}
        {/each}
      </button-row>
    </control-group>

    {#if urlState.viewMode === 'challenges'}
      <control-group>
        <span>Sort</span>
        <button-row>
          {#each sortOptions as option (option.value)}
            {@render iconToggle(option.label, option.icon, urlState.sortMode === option.value, () =>
              urlState.setSortMode(option.value)
            )}
          {/each}
        </button-row>
      </control-group>
    {/if}
  </score-controls>

  <score-actions>
    <team-count>
      <IconUsersGroup aria-hidden="true" />
      {data.entries.length.toLocaleString()} / {data.total.toLocaleString()}
    </team-count>

    <search-slot>
      <ScoresSearch
        value={urlState.searchInput}
        pending={searchPending}
        oninput={value => urlState.setSearchInput(value)}
        onclear={() => urlState.setSearchInput('')}
      />
    </search-slot>

    {#if showDivision}
      <Menu label="Filter by division" items={divisionItems} placement="bottom-end">
        {#snippet trigger({ props })}
          <button {...props} type="button" data-division-trigger>
            <span>{divisionLabel}</span>
            <IconChevronDown aria-hidden="true" />
          </button>
        {/snippet}
      </Menu>
    {/if}
  </score-actions>
</scores-toolbar>

<style>
  scores-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    row-gap: 0.5rem;
    column-gap: 1rem;
    padding-block: 0.5rem;
    padding-inline: 1rem;
  }

  score-title {
    color: var(--foreground-l0);
    font-size: var(--step-1);
  }

  score-controls {
    display: none;
    align-items: center;
    gap: 1rem;
  }

  control-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    > span {
      color: var(--foreground-l3);
      font-size: var(--step--1);
    }
  }

  button-row {
    display: flex;
    gap: 0.125rem;
  }

  score-controls button {
    display: flex;
    align-items: center;
    justify-content: center;
    block-size: 2.25rem;
    padding-inline: 0.75rem;
    color: var(--foreground-l3);
    background: transparent;
    border-radius: var(--radius-md);
    cursor: pointer;

    :global(svg) {
      font-size: 1rem;
    }

    &:hover,
    &[data-active] {
      color: var(--foreground-l1);
      background: var(--background-l3);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }

  score-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-inline-size: 0;
    flex: 1;
    justify-content: flex-end;
  }

  search-slot {
    display: flex;
    flex: 1;
    max-inline-size: 20rem;
    min-inline-size: 0;
  }

  team-count {
    display: none;
    align-items: center;
    gap: 0.375rem;
    color: var(--foreground-l3);
    font-size: var(--step--1);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;

    :global(svg) {
      font-size: 1rem;
    }
  }

  button[data-division-trigger] {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    block-size: 2.25rem;
    padding-inline: 0.75rem;
    color: var(--foreground-l3);
    background: var(--background-l2);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--step--1);
    white-space: nowrap;

    :global(svg) {
      font-size: 1rem;
      opacity: 0.5;
    }

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    &:hover,
    &[data-state='open'] {
      background: var(--background-l3);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }

  @media (width >= 48rem) {
    scores-toolbar {
      padding-inline: 2.25rem;
    }

    score-title {
      display: none;
    }

    score-controls {
      display: flex;
    }

    score-actions {
      flex: initial;
    }

    search-slot {
      flex: initial;
      inline-size: 14rem;
    }
  }

  @media (width >= 80rem) {
    team-count {
      display: flex;
    }
  }
</style>
