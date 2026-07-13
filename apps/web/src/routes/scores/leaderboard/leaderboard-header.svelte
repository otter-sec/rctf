<script lang="ts">
  import { IconX } from '$lib/icons'
  import {
    getChallengeCellsInnerWidth,
    getChallengeCellWidth,
    isDynamicChallenge,
    type CategoryGroup,
    type ChallengeInfo,
  } from '../model/transforms'
  import { CELL_KIND } from './cell-tooltip'
  import { SCORE_CELL_WIDTH_PX } from './constants'
  import type { SortMode, ViewMode } from './url-params'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    categoryGroups: CategoryGroup[]
    challenges: ChallengeInfo[]
    focusedChallengeId: string | null
    onFocus: (id: string) => void
    hoveredColumnId: string | null
  }

  let {
    viewMode,
    sortMode,
    categoryGroups,
    challenges,
    focusedChallengeId,
    onFocus,
    hoveredColumnId,
  }: Props = $props()

  function groupHasFocused(group: CategoryGroup): boolean {
    return (
      focusedChallengeId !== null &&
      group.challenges.some(challenge => challenge.id === focusedChallengeId)
    )
  }

  type HeaderItem =
    | { type: 'category'; group: CategoryGroup }
    | { type: 'challenge'; challenge: ChallengeInfo }

  const headerNameItems = $derived.by((): HeaderItem[] => {
    if (viewMode === 'categories') {
      return categoryGroups.map(group => ({ type: 'category', group }))
    }
    if (sortMode === 'categories') {
      return categoryGroups.flatMap(group =>
        group.challenges.map(challenge => ({ type: 'challenge', challenge }))
      )
    }
    return challenges.map(challenge => ({ type: 'challenge', challenge }))
  })

  function fixedCategoryPoints(group: CategoryGroup): number {
    return group.challenges.reduce(
      (sum, challenge) =>
        sum + (isDynamicChallenge(challenge) ? 0 : challenge.points),
      0
    )
  }

  function hasDynamicChallenge(group: CategoryGroup): boolean {
    return group.challenges.some(isDynamicChallenge)
  }

  function dynamicCount(group: CategoryGroup): number {
    return group.challenges.filter(isDynamicChallenge).length
  }
</script>

{#snippet nameLabel(item: HeaderItem, width: number, stackIndex: number)}
  {@const isCategory = item.type === 'category'}
  {@const challenge = item.type === 'challenge' ? item.challenge : null}
  {@const dynamic = challenge ? isDynamicChallenge(challenge) : false}
  {@const canFocus = challenge !== null}
  {@const isFocused = challenge !== null && focusedChallengeId === challenge.id}
  {@const isDimmed =
    challenge !== null && focusedChallengeId !== null && !isFocused}
  <header-name-slot
    data-category-color={isCategory
      ? item.group.config.color
      : item.challenge.config.color}
    data-dimmed={isDimmed || undefined}
    style:--slot-width={`${width}px`}
    style:z-index={stackIndex}
    data-tooltip-cell
    data-kind={isCategory
      ? CELL_KIND.headerCategory
      : CELL_KIND.headerChallenge}
    data-col={isCategory ? item.group.category : item.challenge.id}
    data-name={isCategory ? item.group.config.name : item.challenge.name}
    data-category={isCategory ? item.group.category : item.challenge.category}
    data-points={isCategory
      ? fixedCategoryPoints(item.group)
      : item.challenge.points}
    data-count={isCategory ? item.group.challenges.length : undefined}
    data-dynamic-count={isCategory
      ? dynamicCount(item.group) || undefined
      : undefined}
    data-dynamic={dynamic ? '' : undefined}
  >
    {#if canFocus && challenge}
      <button
        data-name
        data-focused={isFocused || undefined}
        type="button"
        aria-pressed={isFocused}
        onclick={() => onFocus(challenge.id)}
      >
        <span data-label>{challenge.name}</span>
        {#if isFocused}
          <IconX data-focus-icon aria-hidden="true" />
        {/if}
      </button>
    {:else}
      <span data-name data-category={isCategory || undefined}>
        {isCategory ? item.group.config.name : item.challenge.name}
      </span>
    {/if}
  </header-name-slot>
{/snippet}

{#snippet pointsBadge(points: number, dynamic: boolean)}
  <points-cell>
    {#if dynamic}
      <span data-points-badge data-dynamic>n/a</span>
    {:else}
      <span data-points-badge>{points}</span>
    {/if}
  </points-cell>
{/snippet}

{#snippet categoryFooter(config: CategoryGroup['config'], label: string | null)}
  {@const Icon = config.icon}
  <category-footer data-labeled={label ? true : undefined}>
    <Icon class="category-icon" />
    {#if label}
      <span>{label}</span>
    {/if}
  </category-footer>
{/snippet}

<challenge-header>
  <header-names>
    {#each headerNameItems as item, index (item.type === 'category' ? `category:${item.group.category}` : `challenge:${item.challenge.id}`)}
      {@render nameLabel(
        item,
        item.type === 'category'
          ? SCORE_CELL_WIDTH_PX
          : getChallengeCellWidth(item.challenge),
        headerNameItems.length - index
      )}
    {/each}
  </header-names>

  <header-bars data-challenge-gap={viewMode === 'challenges' || undefined}>
    {#if viewMode === 'categories'}
      <category-row>
        {#each categoryGroups as group (group.category)}
          {@const points = fixedCategoryPoints(group)}
          {@const dynamicOnly = points === 0 && hasDynamicChallenge(group)}
          <category-block
            data-category-color={group.config.color}
            data-col={group.category}
            style:--block-width={`${SCORE_CELL_WIDTH_PX}px`}
          >
            {#if hoveredColumnId === group.category}
              <col-highlight></col-highlight>
            {/if}
            <category-points>
              {@render pointsBadge(points, dynamicOnly)}
            </category-points>
            {@render categoryFooter(group.config, null)}
          </category-block>
        {/each}
      </category-row>
    {:else if sortMode === 'categories'}
      {#each categoryGroups as group (group.category)}
        {@const groupDimmed =
          focusedChallengeId !== null && !groupHasFocused(group)}
        <category-block
          data-category-color={group.config.color}
          data-dimmed={groupDimmed || undefined}
          style:--block-width={`${getChallengeCellsInnerWidth(group.challenges)}px`}
        >
          <column-hits aria-hidden="true">
            {#each group.challenges as challenge (challenge.id)}
              <column-hit
                data-col={challenge.id}
                data-hovered={hoveredColumnId === challenge.id || undefined}
                style:--point-width={`${getChallengeCellWidth(challenge)}px`}
              ></column-hit>
            {/each}
          </column-hits>
          <category-points data-challenge>
            {#each group.challenges as challenge (challenge.id)}
              {@const cellDimmed =
                !groupDimmed &&
                focusedChallengeId !== null &&
                focusedChallengeId !== challenge.id}
              <challenge-point
                data-dimmed={cellDimmed || undefined}
                style:--point-width={`${getChallengeCellWidth(challenge)}px`}
              >
                {@render pointsBadge(
                  challenge.points,
                  isDynamicChallenge(challenge)
                )}
              </challenge-point>
            {/each}
          </category-points>
          {@render categoryFooter(
            group.config,
            group.challenges.length > 1 ? group.config.name : null
          )}
        </category-block>
      {/each}
    {:else}
      {#each challenges as challenge (challenge.id)}
        {@const blockDimmed =
          focusedChallengeId !== null && focusedChallengeId !== challenge.id}
        <category-block
          data-category-color={challenge.config.color}
          data-dimmed={blockDimmed || undefined}
          data-col={challenge.id}
          style:--block-width={`${getChallengeCellWidth(challenge)}px`}
        >
          {#if hoveredColumnId === challenge.id}
            <col-highlight></col-highlight>
          {/if}
          <category-points>
            {@render pointsBadge(
              challenge.points,
              isDynamicChallenge(challenge)
            )}
          </category-points>
          {@render categoryFooter(challenge.config, null)}
        </category-block>
      {/each}
    {/if}
  </header-bars>
</challenge-header>

<style>
  challenge-header {
    display: flex;
    flex-direction: column;
    block-size: 100%;
    margin-inline-end: var(--score-diagonal-overflow);
  }

  header-names {
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    gap: 0.25rem;
    block-size: var(--score-name-row-height);
    overflow: visible;
    translate: 0.25rem 0;
  }

  header-name-slot {
    display: block;
    position: relative;
    inline-size: var(--slot-width);
    block-size: var(--score-name-row-height);
    overflow: visible;
    pointer-events: none;

    &[data-dimmed] {
      opacity: 0.25;
    }
  }

  span[data-name],
  button[data-name] {
    pointer-events: auto;
    position: absolute;
    inset-block-end: 0;
    inset-inline-start: calc(50% + 3px);
    max-inline-size: 9.5rem;
    color: var(--category-foreground-l1);
    font-size: var(--step-0);
    transform-origin: bottom left;
    rotate: -45deg;
  }

  span[data-name] {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-transform: none;

    &[data-category] {
      text-transform: capitalize;
    }
  }

  button[data-name] {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0;
    background: transparent;
    border: 0;
    cursor: pointer;
    transition: translate 150ms ease;

    span[data-label] {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    &:hover {
      translate: 1.5px -1.5px;
      text-decoration: underline;

      :global(svg[data-focus-icon]) {
        opacity: 1;
      }
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      border-radius: var(--radius-xs);
    }

    :global(svg[data-focus-icon]) {
      flex-shrink: 0;
      inline-size: 1rem;
      block-size: 1rem;
      opacity: 0.5;
      transition: opacity 150ms ease;
    }
  }

  header-bars {
    display: flex;
    flex: 1;
    min-block-size: 0;
    align-items: stretch;
    margin-inline-start: 0.25rem;

    &[data-challenge-gap] {
      gap: 0.25rem;
    }
  }

  category-row,
  category-points,
  category-footer {
    display: flex;
  }

  category-row,
  category-points[data-challenge] {
    gap: 0.25rem;
  }

  column-hits {
    position: absolute;
    inset: 0;
    display: flex;
    gap: 0.25rem;
    border-radius: inherit;
  }

  column-hit {
    position: relative;
    display: block;
    inline-size: var(--point-width);

    &::after {
      content: '';
      position: absolute;
      inset-block: 0;
      inset-inline-end: -4px;
      inline-size: 4px;
    }

    &[data-hovered] {
      background: color-mix(in oklab, var(--foreground-l0) 8%, transparent);
    }

    &:first-child {
      border-start-start-radius: inherit;
    }

    &:last-child {
      border-start-end-radius: inherit;
    }
  }

  col-highlight {
    position: absolute;
    inset: 0;
    background: color-mix(in oklab, var(--foreground-l0) 8%, transparent);
    border-radius: inherit;
    pointer-events: none;
  }

  category-points,
  category-footer {
    pointer-events: none;
  }

  category-block {
    position: relative;
    display: flex;
    flex-direction: column;
    inline-size: var(--block-width);
    background: var(--category-background-l0);
    border-start-start-radius: var(--radius-md);
    border-start-end-radius: var(--radius-md);

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      background: var(--background-l0);
      border-radius: inherit;
    }

    &[data-dimmed] {
      opacity: 0.25;
    }
  }

  challenge-point[data-dimmed] {
    opacity: 0.25;
  }

  category-points {
    padding-block: 0.375rem;
  }

  challenge-point {
    display: flex;
    inline-size: var(--point-width);
  }

  points-cell {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  span[data-points-badge] {
    display: flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 1.25rem;
    block-size: 1.25rem;
    color: var(--category-foreground-l1);
    font-size: var(--step--1);
    line-height: 1;
    white-space: nowrap;
    opacity: 0.75;

    &[data-dynamic] {
      font-size: var(--step--2);
    }
  }

  category-footer {
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding-block: 0 0.5rem;
    padding-inline: 0.5rem;
    overflow: hidden;

    span {
      overflow: hidden;
      color: var(--category-foreground-l1);
      font-size: var(--step--1);
      white-space: nowrap;
      text-overflow: ellipsis;
      text-transform: capitalize;
    }
  }

  :global(.category-icon) {
    flex-shrink: 0;
    inline-size: 1.25rem;
    block-size: 1.25rem;
    color: var(--category-foreground-l1);
  }
</style>
