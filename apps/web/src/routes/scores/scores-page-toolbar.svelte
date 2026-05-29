<script lang="ts">
  import { arrowNavigation } from '$lib/actions/arrow-navigation'
  import { DropdownMenu, Tooltip } from '$lib/components'
  import {
    IconCheck,
    IconChevronDown,
    IconLayoutListFilled,
    IconPhotoFilled,
    IconSortAscendingNumbers,
    IconSortDescendingShapesFilled,
    IconTableFilled,
    IconUsersGroup,
    IconX,
    type IconComponent,
  } from '$lib/icons'
  import { getCategoryStyle } from '$lib/utils/categories'
  import { mergeProps } from 'bits-ui'
  import { onMount } from 'svelte'
  import ScoresSearchBox from './scores-page-toolbar-search-box.svelte'
  import type { SortMode, ViewMode } from './scores-shared-types'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    total: number
    loadedCount: number
    divisions: Record<string, string>
    division: string | undefined
    focusedChallenge: { id: string; name: string; icon: IconComponent; color: string } | null
    search: string
    isSearching: boolean
    isDesktop: boolean
    onViewModeChange: (mode: ViewMode) => void
    onSortModeChange: (mode: SortMode) => void
    onDivisionChange: (division: string | undefined) => void
    onScreenshotClick: () => void
    onChallengeFocusClear: () => void
    onSearchChange: (value: string) => void
  }

  let {
    viewMode,
    sortMode,
    total,
    loadedCount,
    divisions,
    division,
    focusedChallenge,
    search,
    isSearching,
    isDesktop,
    onViewModeChange,
    onSortModeChange,
    onDivisionChange,
    onScreenshotClick,
    onChallengeFocusClear,
    onSearchChange,
  }: Props = $props()

  const hasDivisions = $derived(Object.keys(divisions).length > 1)
  const divisionOptions = $derived(
    Object.entries(divisions).map(([value, label]) => ({ value, label }))
  )
  type DivisionSelectionState =
    | { type: 'all'; label: string }
    | { type: 'division'; value: string; label: string }

  const selectedDivision = $derived.by((): DivisionSelectionState => {
    if (!division) return { type: 'all', label: 'All divisions' }
    return { type: 'division', value: division, label: divisions[division] ?? division }
  })
  let mobileSearchInput = $state<HTMLInputElement | null>(null)
  let desktopSearchInput = $state<HTMLInputElement | null>(null)

  const viewOptions = [
    { value: 'challenges' as const, icon: IconTableFilled, label: 'Challenges' },
    { value: 'categories' as const, icon: IconLayoutListFilled, label: 'Categories' },
  ]

  const sortOptions = [
    { value: 'categories' as const, icon: IconSortDescendingShapesFilled, label: 'Category' },
    { value: 'solves' as const, icon: IconSortAscendingNumbers, label: 'Difficulty' },
  ]

  const controlTooltipTether = Tooltip.createTether<string>()

  function selectAllDivisions() {
    onDivisionChange(undefined)
  }

  function selectDivision(value: string) {
    onDivisionChange(value)
  }

  function getVisibleSearchInput() {
    return isDesktop ? desktopSearchInput : mobileSearchInput
  }

  function focusSearchInput() {
    const input = getVisibleSearchInput()
    input?.focus()
    input?.select()
  }

  onMount(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'f') {
        return
      }

      const input = getVisibleSearchInput()
      if (!input) return

      event.preventDefault()
      focusSearchInput()
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  })
</script>

{#snippet divisionDropdown()}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger type="button" class="division-trigger">
      <span>{selectedDivision.label}</span>
      <IconChevronDown class="icon chevron" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end" class="division-menu">
      <DropdownMenu.Item class="division-item" onclick={selectAllDivisions}>
        <span>All divisions</span>
        <check-mark selected={selectedDivision.type === 'all' || undefined}>
          <IconCheck />
        </check-mark>
      </DropdownMenu.Item>
      {#each divisionOptions as option (option.value)}
        {@const isSelected =
          selectedDivision.type === 'division' && selectedDivision.value === option.value}
        <DropdownMenu.Item class="division-item" onclick={() => selectDivision(option.value)}>
          <span>{option.label}</span>
          <check-mark selected={isSelected || undefined}>
            <IconCheck />
          </check-mark>
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/snippet}

<score-toolbar>
  <score-mobile-row>
    <score-title>Scoreboard</score-title>

    <score-controls use:arrowNavigation role="toolbar" aria-label="Scoreboard display controls">
      <score-control-group>
        <span>View</span>
        <score-button-row>
          {#each viewOptions as option (option.value)}
            <Tooltip.Trigger tether={controlTooltipTether} payload={option.label}>
              {#snippet child({ props })}
                {@const buttonProps = mergeProps(props, {
                  onclick: () => onViewModeChange(option.value),
                  'aria-label': option.label,
                  'aria-pressed': viewMode === option.value,
                })}
                <button
                  {...buttonProps}
                  type="button"
                  data-active={viewMode === option.value ? '' : undefined}
                >
                  <option.icon class="icon" />
                </button>
              {/snippet}
            </Tooltip.Trigger>
          {/each}
        </score-button-row>
      </score-control-group>

      {#if viewMode === 'challenges'}
        <score-control-group>
          <span>Sort</span>
          <score-button-row>
            {#each sortOptions as option (option.value)}
              <Tooltip.Trigger tether={controlTooltipTether} payload={option.label}>
                {#snippet child({ props })}
                  {@const buttonProps = mergeProps(props, {
                    onclick: () => onSortModeChange(option.value),
                    'aria-label': option.label,
                    'aria-pressed': sortMode === option.value,
                  })}
                  <button
                    {...buttonProps}
                    type="button"
                    data-active={sortMode === option.value ? '' : undefined}
                  >
                    <option.icon class="icon" />
                  </button>
                {/snippet}
              </Tooltip.Trigger>
            {/each}
          </score-button-row>
        </score-control-group>
      {/if}
    </score-controls>

    <score-actions mobile>
      {#if hasDivisions}
        {@render divisionDropdown()}
      {/if}

      <button data-square type="button" onclick={onScreenshotClick}>
        <IconPhotoFilled class="icon" />
      </button>
    </score-actions>
  </score-mobile-row>

  <score-mobile-search>
    <ScoresSearchBox bind:inputRef={mobileSearchInput} {search} {isSearching} {onSearchChange} />
  </score-mobile-search>

  <score-actions desktop>
    {#if focusedChallenge}
      <score-filter>
        <span>Filtering by</span>
        <a
          href="/challenges?challenge={focusedChallenge.id}"
          style={getCategoryStyle(focusedChallenge.color)}
        >
          <focusedChallenge.icon class="icon" />
          <span>{focusedChallenge.name}</span>
        </a>
        <button data-clear type="button" onclick={onChallengeFocusClear}>
          <IconX class="icon small" />
        </button>
      </score-filter>
    {/if}

    <score-count>
      <IconUsersGroup class="icon" />
      {loadedCount.toLocaleString()} / {total.toLocaleString()}
    </score-count>

    <ScoresSearchBox
      bind:inputRef={desktopSearchInput}
      compact
      {search}
      {isSearching}
      {onSearchChange}
    />

    {#if hasDivisions}
      {@render divisionDropdown()}
    {/if}

    <button data-screenshot type="button" onclick={onScreenshotClick}>
      <IconPhotoFilled class="icon" />
      <span>Screenshot</span>
    </button>
  </score-actions>
</score-toolbar>

<Tooltip.Root tether={controlTooltipTether}>
  {#snippet children({ payload })}
    {#if payload}
      <Tooltip.Content side="bottom">{payload}</Tooltip.Content>
    {/if}
  {/snippet}
</Tooltip.Root>

<style>
  score-toolbar {
    display: flex;
    flex-direction: column;
    gap: calc(var(--spacing) * 2);
    padding-block: calc(var(--spacing) * 2);
    padding-inline: calc(var(--spacing) * 4);

    score-mobile-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    score-title {
      color: var(--foreground-l0);
      font-size: var(--text-lg);
    }

    score-controls,
    score-actions[desktop],
    score-count {
      display: none;
    }

    score-actions,
    score-control-group,
    score-button-row,
    score-filter,
    score-filter a,
    score-count,
    button[data-screenshot] {
      align-items: center;
    }

    score-actions,
    score-button-row {
      display: flex;
    }

    score-actions[mobile] {
      gap: calc(var(--spacing) * 1.5);
    }

    score-actions[desktop] {
      gap: calc(var(--spacing) * 2);
    }

    score-control-group {
      display: flex;
      gap: calc(var(--spacing) * 2);
    }

    score-button-row {
      gap: calc(var(--spacing) * 0.5);
    }

    score-control-group > span,
    score-count,
    score-filter > span,
    button[data-screenshot] span {
      color: var(--foreground-l3);
      font-size: var(--text-sm);
    }

    button {
      border: 0;
      outline: none;
    }

    score-controls button,
    button[data-square],
    button[data-screenshot] {
      height: calc(var(--spacing) * 9);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      background: var(--background-l2);
      color: var(--foreground-l1);
    }

    score-controls button,
    button[data-screenshot],
    :global(.division-trigger) {
      padding-inline: calc(var(--spacing) * 3);
    }

    button[data-square] {
      width: calc(var(--spacing) * 9);
    }

    score-controls button {
      color: var(--foreground-l3);
      background: transparent;

      &:hover,
      &[data-active] {
        color: var(--foreground-l1);
        background: var(--background-l3);
      }
    }

    button[data-square]:hover,
    button[data-screenshot]:hover {
      background: var(--background-l3);
    }

    button:focus-visible,
    :global(.division-trigger:focus-visible) {
      box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
    }

    :global(.division-trigger) {
      height: calc(var(--spacing) * 9);
      display: flex;
      align-items: center;
      width: auto;
      justify-content: space-between;
      gap: calc(var(--spacing) * 1.5);
      border: 0;
      border-radius: var(--radius-md);
      outline: none;
      background: var(--background-l2);
      color: var(--foreground-l3);
      font-size: var(--text-sm);
      white-space: nowrap;

      &:hover,
      &[data-state='open'] {
        background: var(--background-l3);
      }

      span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    :global(.icon) {
      width: calc(var(--spacing) * 4);
      height: calc(var(--spacing) * 4);
      flex-shrink: 0;
    }

    :global(.icon.chevron) {
      opacity: 0.5;
    }

    score-mobile-search {
      display: block;
    }

    score-filter {
      height: calc(var(--spacing) * 9);
      display: flex;
      gap: calc(var(--spacing) * 1.5);
      padding-inline: calc(var(--spacing) * 3);
      border-radius: var(--radius-md);
      background: var(--background-l2);

      a {
        min-width: 0;
        display: flex;
        gap: calc(var(--spacing) * 1);
        color: var(--category-foreground-l1);
        font-size: var(--text-sm);
        text-decoration: underline;
        text-decoration-color: color-mix(in oklab, currentColor 50%, transparent);
        text-underline-offset: 2px;
        transition: text-decoration-color 150ms ease;

        &:hover {
          text-decoration-color: currentColor;
        }

        span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      button[data-clear] {
        width: calc(var(--spacing) * 5);
        height: calc(var(--spacing) * 5);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-inline-end: calc(var(--spacing) * -1.5);
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--foreground-l3);
        transition: color 150ms ease;

        &:hover,
        &:focus-visible {
          color: var(--foreground-l1);
        }
      }

      :global(.icon.small) {
        width: calc(var(--spacing) * 3.5);
        height: calc(var(--spacing) * 3.5);
      }
    }

    score-count {
      gap: calc(var(--spacing) * 1.5);
      padding-inline: calc(var(--spacing) * 2);
      font-variant-numeric: tabular-nums;
    }

    button[data-screenshot] {
      gap: calc(var(--spacing) * 2);

      span {
        display: none;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    @media (width >= 48rem) {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding-inline: calc(var(--spacing) * 9);

      score-mobile-row {
        display: contents;
      }

      score-title,
      score-actions[mobile],
      score-mobile-search {
        display: none;
      }

      score-controls,
      score-actions[desktop] {
        display: flex;
      }

      score-controls {
        align-items: center;
        gap: calc(var(--spacing) * 4);
      }
    }

    @media (width >= 80rem) {
      score-count {
        display: flex;
      }

      button[data-screenshot] span {
        display: inline;
      }
    }
  }

  :global(.division-menu) {
    min-width: var(--bits-dropdown-menu-anchor-width);
    border: 2px solid var(--background-l5);
    background: var(--background-l4);
  }

  :global(.division-item) {
    justify-content: space-between;

    &[data-highlighted] {
      background: var(--background-l5);
    }

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  check-mark {
    display: block;
    width: calc(var(--spacing) * 4);
    height: calc(var(--spacing) * 4);
    flex-shrink: 0;
    margin-inline-start: auto;

    &:not([selected]) {
      color: transparent;
    }

    :global(svg) {
      width: 100%;
      height: 100%;
    }
  }
</style>
