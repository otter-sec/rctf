<script lang="ts">
  import {
    getChallengeCellsInnerWidth,
    getChallengeCellWidth,
    isDynamicChallenge,
    type CategoryGroup,
    type ChallengeInfo,
  } from './scores-transforms'
  import type { SortMode, ViewMode } from './scores-url-params'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    categoryGroups: CategoryGroup[]
    challenges: ChallengeInfo[]
  }

  let { viewMode, sortMode, categoryGroups, challenges }: Props = $props()

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
</script>

{#snippet nameLabel(
  label: string,
  color: string,
  width: number,
  stackIndex: number,
  isCategory: boolean
)}
  <header-name-slot
    data-category-color={color}
    style:--slot-width={`${width}px`}
    style:z-index={stackIndex}
  >
    <span data-name data-category={isCategory || undefined}>{label}</span>
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
      {#if item.type === 'category'}
        {@render nameLabel(
          item.group.config.name,
          item.group.config.color,
          48,
          headerNameItems.length - index,
          true
        )}
      {:else}
        {@render nameLabel(
          item.challenge.name,
          item.challenge.config.color,
          getChallengeCellWidth(item.challenge),
          headerNameItems.length - index,
          false
        )}
      {/if}
    {/each}
  </header-names>

  <header-bars data-challenge-gap={viewMode === 'challenges' || undefined}>
    {#if viewMode === 'categories'}
      <category-row>
        {#each categoryGroups as group (group.category)}
          {@const points = fixedCategoryPoints(group)}
          {@const dynamicOnly = points === 0 && hasDynamicChallenge(group)}
          <category-block data-category-color={group.config.color} style:--block-width="48px">
            <category-points>
              {@render pointsBadge(points, dynamicOnly)}
            </category-points>
            {@render categoryFooter(group.config, null)}
          </category-block>
        {/each}
      </category-row>
    {:else if sortMode === 'categories'}
      {#each categoryGroups as group (group.category)}
        <category-block
          data-category-color={group.config.color}
          style:--block-width={`${getChallengeCellsInnerWidth(group.challenges)}px`}
        >
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
    inline-size: 1.25rem;
    block-size: 1.25rem;
    color: var(--category-foreground-l1);
    font-size: var(--step--1);
    line-height: 1;
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
