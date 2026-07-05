<script lang="ts">
  import IconBinaryTree from '$lib/icons/icon-binary-tree-filled.svelte'
  import IconChevronDown from '$lib/icons/icon-chevron-down.svelte'
  import IconFold from '$lib/icons/icon-fold.svelte'
  import IconTable from '$lib/icons/icon-table-filled.svelte'
  import IconTrophy from '$lib/icons/icon-trophy-filled.svelte'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'
  import type { Component } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import type { ScoresData } from './scores-data.svelte'
  import ScoresSearch from './scores-search.svelte'
  import { moveRovingIndex } from './scores-toolbar-roving'
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

  // Single tab stop with ArrowLeft/ArrowRight + Home/End moving focus among the
  // toolbar's controls (R21). The search input keeps its own caret behaviour, so
  // arrow keys are only repurposed while focus rests on a button-like control.
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
      if (current === -1 || active instanceof HTMLInputElement) return
      const next = moveRovingIndex(current, list.length, event.key)
      if (next === null) return
      event.preventDefault()
      list[next]?.focus()
    }

    const onFocusin = (event: FocusEvent) => setTabStops(event.target as HTMLElement)

    setTabStops(null)
    node.addEventListener('keydown', onKeydown)
    node.addEventListener('focusin', onFocusin)
    // Re-sync the single tab stop when the set of controls changes: the sort
    // toggle mounts/unmounts with the view, and the clear button toggles its
    // data-roving as the query empties.
    const observer = new MutationObserver(() => setTabStops(document.activeElement as HTMLElement))
    observer.observe(node, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-roving'],
    })

    return () => {
      node.removeEventListener('keydown', onKeydown)
      node.removeEventListener('focusin', onFocusin)
      observer.disconnect()
    }
  }
</script>

{#snippet toggle(label: string, Icon: Component, active: boolean, onclick: () => void)}
  <button
    data-roving
    type="button"
    data-active={active || undefined}
    aria-pressed={active}
    {onclick}
  >
    <Icon />
    <span>{label}</span>
  </button>
{/snippet}

<scores-toolbar role="toolbar" aria-label="Scoreboard controls" {@attach rovingFocus}>
  <toolbar-controls>
    <toggle-group aria-label="View">
      {@render toggle('Challenges', IconTable, urlState.viewMode === 'challenges', () =>
        urlState.setViewMode('challenges')
      )}
      {@render toggle('Categories', IconBinaryTree, urlState.viewMode === 'categories', () =>
        urlState.setViewMode('categories')
      )}
    </toggle-group>

    {#if urlState.viewMode === 'challenges'}
      <toggle-group aria-label="Sort">
        {@render toggle('Category', IconFold, urlState.sortMode === 'categories', () =>
          urlState.setSortMode('categories')
        )}
        {@render toggle('Solves', IconTrophy, urlState.sortMode === 'solves', () =>
          urlState.setSortMode('solves')
        )}
      </toggle-group>
    {/if}

    {#if showDivision}
      <Menu label="Filter by division" items={divisionItems} placement="bottom-start">
        {#snippet trigger({ props })}
          <button {...props} data-roving type="button" data-division-trigger>
            <span>{divisionLabel}</span>
            <IconChevronDown />
          </button>
        {/snippet}
      </Menu>
    {/if}
  </toolbar-controls>

  <toolbar-end>
    <team-count aria-hidden="true">
      {data.entries.length.toLocaleString()} / {data.total.toLocaleString()}
    </team-count>

    <ScoresSearch
      value={urlState.searchInput}
      pending={searchPending}
      oninput={value => urlState.setSearchInput(value)}
      onclear={() => urlState.setSearchInput('')}
    />
  </toolbar-end>
</scores-toolbar>

<style>
  scores-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    gap: var(--space-xs);
    padding: var(--space-s) var(--space-m);
  }

  toolbar-controls,
  toolbar-end {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  toggle-group {
    display: flex;
    gap: 0.25rem;
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    block-size: 2.25rem;
    padding-inline: var(--space-s);
    color: var(--foreground-l1);
    background: var(--background-l4);
    border-radius: var(--radius-md);
    cursor: pointer;
    white-space: nowrap;

    :global(svg) {
      font-size: 1.125rem;
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

  button[data-division-trigger] {
    gap: var(--space-2xs);

    :global(svg) {
      font-size: 1rem;
      opacity: 0.6;
    }

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  team-count {
    display: none;
    color: var(--foreground-l1);
    font-size: var(--step--1);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;

    @media (width >= 80rem) {
      display: block;
    }
  }
</style>
