<script lang="ts">
  import { SCORE_CELL_WIDTH_PX, SCORE_ROW_GAP_PX } from './constants'
  import { CELL_KIND } from './cell-tooltip'
  import {
    getChallengeCellsInnerWidth,
    getChallengeCellWidth,
    isDynamicChallenge,
    type CategoryGroup,
    type ChallengeInfo,
  } from '../model/transforms'
  import type { SortMode, ViewMode } from './url-params'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    categoryGroups: CategoryGroup[]
    challenges: ChallengeInfo[]
    hoveredColumnId: string | null
  }

  let { viewMode, sortMode, categoryGroups, challenges, hoveredColumnId }: Props = $props()

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
      (sum, challenge) => sum + (isDynamicChallenge(challenge) ? 0 : challenge.points),
      0
    )
  }

  function hasDynamicChallenge(group: CategoryGroup): boolean {
    return group.challenges.some(isDynamicChallenge)
  }

  function dynamicCount(group: CategoryGroup): number {
    return group.challenges.filter(isDynamicChallenge).length
  }

  function groupColumnHighlight(group: CategoryGroup): { x: number; width: number } | null {
    let x = 0
    for (const challenge of group.challenges) {
      const width = getChallengeCellWidth(challenge)
      if (challenge.id === hoveredColumnId) return { x, width }
      x += width + SCORE_ROW_GAP_PX
    }
    return null
  }
</script>

{#snippet nameLabel(item: HeaderItem, width: number, stackIndex: number)}
  {@const isCategory = item.type === 'category'}
  <header-name-slot
    data-category-color={isCategory ? item.group.config.color : item.challenge.config.color}
    style:--slot-width={`${width}px`}
    style:z-index={stackIndex}
    data-tooltip-cell
    data-kind={isCategory ? CELL_KIND.headerCategory : CELL_KIND.headerChallenge}
    data-col={isCategory ? item.group.category : item.challenge.id}
    data-name={isCategory ? item.group.config.name : item.challenge.name}
    data-points={isCategory ? fixedCategoryPoints(item.group) : item.challenge.points}
    data-count={isCategory ? item.group.challenges.length : undefined}
    data-dynamic-count={isCategory ? dynamicCount(item.group) || undefined : undefined}
    data-dynamic={!isCategory && isDynamicChallenge(item.challenge) ? '' : undefined}
  >
    <span data-name data-category={isCategory || undefined}>
      {isCategory ? item.group.config.name : item.challenge.name}
    </span>
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
        item.type === 'category' ? SCORE_CELL_WIDTH_PX : getChallengeCellWidth(item.challenge),
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
        {@const highlight = groupColumnHighlight(group)}
        <category-block
          data-category-color={group.config.color}
          style:--block-width={`${getChallengeCellsInnerWidth(group.challenges)}px`}
        >
          {#if highlight}
            <col-highlight
              style:--highlight-x={`${highlight.x}px`}
              style:--highlight-width={`${highlight.width}px`}
            ></col-highlight>
          {/if}
          <category-points data-challenge>
            {#each group.challenges as challenge (challenge.id)}
              <challenge-point style:--point-width={`${getChallengeCellWidth(challenge)}px`}>
                {@render pointsBadge(challenge.points, isDynamicChallenge(challenge))}
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
        <category-block
          data-category-color={challenge.config.color}
          style:--block-width={`${getChallengeCellWidth(challenge)}px`}
        >
          {#if hoveredColumnId === challenge.id}
            <col-highlight></col-highlight>
          {/if}
          <category-points>
            {@render pointsBadge(challenge.points, isDynamicChallenge(challenge))}
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
  }

  span[data-name] {
    position: absolute;
    inset-block-end: 0;
    inset-inline-start: 50%;
    max-inline-size: 9.5rem;
    overflow: hidden;
    color: var(--category-foreground-l1);
    font-size: var(--step-0);
    line-height: 1;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-transform: none;
    transform-origin: bottom left;
    rotate: -45deg;
  }

  span[data-name][data-category] {
    text-transform: capitalize;
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

  col-highlight {
    position: absolute;
    inset-block: 0;
    inset-inline-start: var(--highlight-x, 0);
    inline-size: var(--highlight-width, 100%);
    background: color-mix(in oklab, var(--foreground-l0) 8%, transparent);
    border-radius: inherit;
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
    gap: 0.25rem;
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
