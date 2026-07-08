<script lang="ts">
  import {
    IconCaretDown,
    IconImage,
    IconLayoutListFilled,
    IconSortAscendingNumbers,
    IconSortDescendingShapesFilled,
    IconTableFilled,
    IconUsersThree,
    IconX,
  } from '$lib/icons'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import { getCategoryConfig } from '$lib/utils/categories'
  import { createRovingFocus } from '$lib/utils/roving'
  import type { Component } from 'svelte'
  import type { ScoresData } from '../model/data.svelte'
  import type { ScoresUrlState } from '../model/url-state.svelte'
  import ScoresSearch from './toolbar-search.svelte'

  interface Props {
    data: ScoresData
    urlState: ScoresUrlState
    divisions: Record<string, string>
    onScreenshot: () => void
  }

  let { data, urlState, divisions, onScreenshot }: Props = $props()

  const focusedChallenge = $derived.by(() => {
    const id = urlState.focusedChallengeId
    const challenge = id ? data.challengesData[id] : null
    if (!id || !challenge) return null
    const config = getCategoryConfig(challenge.category)
    return { id, name: challenge.name, color: config.color, icon: config.icon }
  })

  const showDivision = $derived(Object.keys(divisions).length > 1)
  const divisionLabel = $derived(
    urlState.division ? (divisions[urlState.division] ?? urlState.division) : 'All divisions'
  )
  const divisionItems = $derived<MenuItem[]>([
    {
      value: '',
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

  const rovingFocus = createRovingFocus()
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
    {#if focusedChallenge}
      <filter-chip data-category-color={focusedChallenge.color}>
        <span data-label>Filtering by</span>
        <a href="/challenges?challenge={focusedChallenge.id}">
          <focusedChallenge.icon aria-hidden="true" />
          <span>{focusedChallenge.name}</span>
        </a>
        <button
          type="button"
          data-clear
          aria-label="Clear challenge filter"
          onclick={() => urlState.setFocusedChallenge(null)}
        >
          <IconX aria-hidden="true" />
        </button>
      </filter-chip>
    {/if}

    <team-count>
      <IconUsersThree aria-hidden="true" />
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

    <Tooltip label="Export screenshot">
      {#snippet children({ props })}
        <button
          {...props}
          type="button"
          data-screenshot
          aria-label="Export screenshot"
          onclick={onScreenshot}
        >
          <IconImage aria-hidden="true" />
        </button>
      {/snippet}
    </Tooltip>

    {#if showDivision}
      <Menu label="Filter by division" items={divisionItems} placement="bottom-end">
        {#snippet trigger({ props })}
          <button {...props} type="button" data-division-trigger>
            <span>{divisionLabel}</span>
            <IconCaretDown aria-hidden="true" />
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

  score-controls {
    display: none;
    align-items: center;
    gap: 1rem;

    button {
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
      }
    }
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

  filter-chip {
    display: none;
    align-items: center;
    gap: 0.375rem;
    block-size: 2.25rem;
    padding-inline: 0.75rem;
    background: var(--background-l2);
    border-radius: var(--radius-md);
    white-space: nowrap;

    > span[data-label] {
      color: var(--foreground-l3);
      font-size: var(--step--1);
    }

    a {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      min-inline-size: 0;
      color: var(--category-foreground-l1);
      font-size: var(--step--1);
      text-decoration: underline;
      text-decoration-color: color-mix(in oklab, currentColor 50%, transparent);
      text-underline-offset: 2px;
      transition: text-decoration-color 150ms ease;

      &:hover {
        text-decoration-color: currentColor;
      }

      span {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      :global(svg) {
        flex-shrink: 0;
        font-size: 1rem;
      }
    }

    button[data-clear] {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      inline-size: 1.25rem;
      block-size: 1.25rem;
      margin-inline-end: -0.375rem;
      color: var(--foreground-l3);
      background: transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: color 150ms ease;

      :global(svg) {
        font-size: 0.875rem;
      }

      &:hover {
        color: var(--foreground-l1);
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
      }
    }
  }

  button[data-screenshot] {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    block-size: 2.25rem;
    inline-size: 2.25rem;
    color: var(--foreground-l3);
    background: var(--background-l2);
    border-radius: var(--radius-md);
    cursor: pointer;

    :global(svg) {
      font-size: 1rem;
    }

    &:hover,
    &[data-state='open'] {
      color: var(--foreground-l1);
      background: var(--background-l3);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
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
    }
  }

  @media (width >= 48rem) {
    scores-toolbar {
      padding-inline: 2.25rem;
    }

    score-controls {
      display: flex;
    }

    filter-chip {
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
