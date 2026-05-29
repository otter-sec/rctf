<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconX } from '$lib/icons'
  import { getCategoryStyle } from '$lib/utils/categories'
  import { mergeProps } from 'bits-ui'
  import {
    getChallengeCellsInnerWidth,
    getChallengeCellWidth,
    isDynamicChallenge,
  } from './scores-leaderboard-data-transforms'
  import { SCORE_CELL_WIDTH_PX } from './scores-leaderboard-layout-constants'
  import type { CategoryGroup, ChallengeInfo, SortMode, ViewMode } from './scores-shared-types'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    categoryGroups: CategoryGroup[]
    challenges: ChallengeInfo[]
    focusedChallengeId: string | null
    onChallengeFocus: (id: string) => void
  }

  let {
    viewMode,
    sortMode,
    categoryGroups,
    challenges,
    focusedChallengeId,
    onChallengeFocus,
  }: Props = $props()

  type HeaderItem =
    | { type: 'category'; group: CategoryGroup }
    | { type: 'challenge'; challenge: ChallengeInfo }

  type HeaderTooltipPayload = {
    title: string
    subtitle?: string
    capitalizeTitle?: boolean
  }

  const tooltipTether = Tooltip.createTether<HeaderTooltipPayload>()

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

  function challengeSubtitle(challenge: ChallengeInfo) {
    if (isDynamicChallenge(challenge)) return 'Dynamic scoring'
    return `${challenge.points} pts \u00b7 ${challenge.solves} solve${challenge.solves !== 1 ? 's' : ''}`
  }

  function fixedCategoryPoints(group: CategoryGroup) {
    return group.challenges.reduce(
      (sum, challenge) => sum + (isDynamicChallenge(challenge) ? 0 : challenge.points),
      0
    )
  }

  function dynamicChallengeCount(group: CategoryGroup) {
    return group.challenges.filter(isDynamicChallenge).length
  }

  function categorySubtitle(group: CategoryGroup, fixedPoints: number, dynamicCount: number) {
    const challengeCount = group.challenges.length
    const challengeText = `${challengeCount} challenge${challengeCount !== 1 ? 's' : ''}`
    if (dynamicCount === 0) return `${challengeText} \u00b7 ${fixedPoints} pts`
    const dynamicText = `${dynamicCount} dynamic`
    if (fixedPoints === 0) return `${challengeText} \u00b7 ${dynamicText}`
    return `${challengeText} \u00b7 ${fixedPoints} pts + ${dynamicText}`
  }
</script>

{#snippet challengeNameLabel(
  item: ChallengeInfo | CategoryGroup,
  isCategory: boolean,
  stackIndex: number
)}
  {@const isFocused = !isCategory && focusedChallengeId === (item as ChallengeInfo).id}
  {@const isDimmed = !isCategory && focusedChallengeId !== null && !isFocused}
  {@const slotWidth = isCategory
    ? SCORE_CELL_WIDTH_PX
    : getChallengeCellWidth(item as ChallengeInfo)}
  <header-name-slot
    dimmed={isDimmed || undefined}
    style="{getCategoryStyle(item.config.color)} z-index: {stackIndex}; width: {slotWidth}px;"
  >
    {#if !isCategory}
      {@const challenge = item as ChallengeInfo}
      {@const challengeIsDynamic = isDynamicChallenge(challenge)}
      <Tooltip.Trigger tether={tooltipTether} payload={{ title: challenge.name }}>
        {#snippet child({ props })}
          {#if challengeIsDynamic}
            <span {...props} data-challenge-name>{challenge.name}</span>
          {:else}
            {@const buttonProps = mergeProps(props, {
              onclick: () => onChallengeFocus(challenge.id),
            })}
            <button {...buttonProps} type="button" data-focused={isFocused ? '' : undefined}>
              <span>{challenge.name}</span>
              {#if isFocused}
                <IconX class="focus-icon" />
              {/if}
            </button>
          {/if}
        {/snippet}
      </Tooltip.Trigger>
    {:else}
      {@const group = item as CategoryGroup}
      <Tooltip.Trigger
        tether={tooltipTether}
        payload={{ title: group.config.name, capitalizeTitle: true }}
        tabindex={-1}
      >
        {#snippet child({ props })}
          <span {...props} data-category-name>
            {group.config.name}
          </span>
        {/snippet}
      </Tooltip.Trigger>
    {/if}
  </header-name-slot>
{/snippet}

{#snippet categoryIcon(group: CategoryGroup, showLabel: boolean = false)}
  {@const Icon = group.config.icon}
  {#if showLabel && group.challenges.length > 1}
    <Icon class="category-icon" />
    <span>{group.config.name}</span>
  {:else}
    <Tooltip.Trigger
      tether={tooltipTether}
      payload={{ title: group.config.name, capitalizeTitle: true }}
      tabindex={-1}
      class="category-icon-trigger"
    >
      <Icon class="category-icon" />
    </Tooltip.Trigger>
  {/if}
{/snippet}

{#snippet pointsBadge(
  points: number,
  tooltipContent?: HeaderTooltipPayload,
  dynamic: boolean = false
)}
  {#if dynamic}
    <span class="points-trigger" data-static-points>
      <span data-points-badge data-dynamic>n/a</span>
    </span>
  {:else if tooltipContent}
    <Tooltip.Trigger
      tether={tooltipTether}
      payload={tooltipContent}
      tabindex={-1}
      class="points-trigger"
    >
      <span data-points-badge>{points}</span>
    </Tooltip.Trigger>
  {:else}
    <span class="points-trigger" data-static-points>
      <span data-points-badge>{points}</span>
    </span>
  {/if}
{/snippet}

<challenge-header>
  <header-names>
    {#each headerNameItems as item, index (item.type === 'category' ? `category:${item.group.category}` : `challenge:${item.challenge.id}`)}
      {#if item.type === 'category'}
        {@render challengeNameLabel(item.group, true, headerNameItems.length - index)}
      {:else}
        {@render challengeNameLabel(item.challenge, false, headerNameItems.length - index)}
      {/if}
    {/each}
  </header-names>

  <header-bars challenge-gap={viewMode === 'challenges' || undefined}>
    {#if viewMode === 'categories'}
      <category-row>
        {#each categoryGroups as group (group.category)}
          {@const totalPoints = fixedCategoryPoints(group)}
          {@const dynamicCount = dynamicChallengeCount(group)}
          {@const showDynamicBadge = totalPoints === 0 && dynamicCount > 0}
          <category-block
            style="{getCategoryStyle(group.config.color)} width: {SCORE_CELL_WIDTH_PX}px;"
          >
            <category-points>
              {@render pointsBadge(
                totalPoints,
                {
                  title: group.config.name,
                  subtitle: categorySubtitle(group, totalPoints, dynamicCount),
                  capitalizeTitle: true,
                },
                showDynamicBadge
              )}
            </category-points>
            <category-footer>
              {@render categoryIcon(group)}
            </category-footer>
          </category-block>
        {/each}
      </category-row>
    {:else if sortMode === 'categories'}
      {#each categoryGroups as group (group.category)}
        {@const groupHasFocused =
          focusedChallengeId !== null && group.challenges.some(c => c.id === focusedChallengeId)}
        {@const groupIsDimmed = focusedChallengeId !== null && !groupHasFocused}
        <category-block
          dimmed={groupIsDimmed || undefined}
          style="{getCategoryStyle(group.config.color)} width: {getChallengeCellsInnerWidth(
            group.challenges
          )}px;"
        >
          <category-points challenge>
            {#each group.challenges as challenge (challenge.id)}
              {@const isDimmed = focusedChallengeId !== null && focusedChallengeId !== challenge.id}
              {@const isDynamic = isDynamicChallenge(challenge)}
              <challenge-point
                dimmed={(isDimmed && !groupIsDimmed) || undefined}
                style:width={`${getChallengeCellWidth(challenge)}px`}
              >
                {@render pointsBadge(
                  challenge.points,
                  {
                    title: challenge.name,
                    subtitle: challengeSubtitle(challenge),
                  },
                  isDynamic
                )}
              </challenge-point>
            {/each}
          </category-points>
          <category-footer
            labeled
            style:--score-category-width={`${getChallengeCellsInnerWidth(group.challenges)}px`}
          >
            {@render categoryIcon(group, true)}
          </category-footer>
        </category-block>
      {/each}
    {:else}
      {#each challenges as challenge (challenge.id)}
        {@const isFocused = focusedChallengeId === challenge.id}
        {@const isDimmed = focusedChallengeId !== null && !isFocused}
        {@const isDynamic = isDynamicChallenge(challenge)}
        <category-block
          dimmed={isDimmed || undefined}
          style="{getCategoryStyle(challenge.config.color)} width: {getChallengeCellWidth(
            challenge
          )}px;"
        >
          <category-points>
            {@render pointsBadge(
              challenge.points,
              {
                title: challenge.name,
                subtitle: challengeSubtitle(challenge),
              },
              isDynamic
            )}
          </category-points>
          <category-footer>
            {@render categoryIcon({
              config: challenge.config,
              category: challenge.category,
              challenges: [],
            })}
          </category-footer>
        </category-block>
      {/each}
    {/if}
  </header-bars>
</challenge-header>

<Tooltip.Root tether={tooltipTether}>
  {#snippet children({ payload })}
    {#if payload}
      <Tooltip.Content side="bottom" sideOffset={4}>
        <p data-category-title={payload.capitalizeTitle ? '' : undefined}>{payload.title}</p>
        {#if payload.subtitle}
          <p data-muted>{payload.subtitle}</p>
        {/if}
      </Tooltip.Content>
    {/if}
  {/snippet}
</Tooltip.Root>

<style>
  challenge-header {
    display: flex;
    flex-direction: column;
    margin-inline-end: var(--score-diagonal-overflow);

    header-names {
      height: var(--score-name-row-height);
      display: flex;
      align-items: flex-end;
      justify-content: flex-start;
      gap: calc(var(--spacing) * 1);
      overflow: visible;
      translate: var(--spacing) 0;

      > header-name-slot {
        height: var(--score-name-row-height);
      }
    }

    header-name-slot {
      display: block;
      position: relative;
      width: var(--score-cell-width);
      overflow: visible;

      &[dimmed] {
        opacity: 0.25;
      }

      button,
      span[data-challenge-name],
      span[data-category-name] {
        position: absolute;
        inset-block-end: 0;
        inset-inline-start: 50%;
        max-width: calc(var(--spacing) * 37.5);
        transform-origin: bottom left;
        rotate: -45deg;
        color: var(--category-foreground-l1);
        font-size: var(--text-lg);
        line-height: 1;
      }

      button {
        display: flex;
        align-items: center;
        gap: calc(var(--spacing) * 1);
        border: 0;
        border-radius: var(--radius-xs);
        background: transparent;
        cursor: pointer;
        outline: none;
        transition: translate 150ms ease;

        &:hover {
          translate: 1.5px -1.5px;
          text-decoration: underline;

          :global(.focus-icon) {
            opacity: 1;
          }
        }

        &:focus-visible {
          outline: 3px solid color-mix(in oklab, var(--ring) 50%, transparent);
          outline-offset: 3px;
        }
      }

      button span,
      span[data-challenge-name],
      span[data-category-name] {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    header-bars {
      display: flex;
      align-items: stretch;
      margin-inline-start: calc(var(--spacing) * 1);

      &[challenge-gap] {
        gap: calc(var(--spacing) * 1);
      }
    }

    category-row,
    category-points,
    category-footer {
      display: flex;
    }

    category-row,
    category-points[challenge] {
      gap: calc(var(--spacing) * 1);
    }

    category-block {
      position: relative;
      display: flex;
      flex-direction: column;
      border-start-start-radius: var(--radius-lg);
      border-start-end-radius: var(--radius-lg);
      background: var(--category-background-l0);

      &[dimmed] {
        opacity: 0.25;
      }

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;
        border-radius: inherit;
        background: var(--background-l0);
      }
    }

    category-points {
      padding-block: calc(var(--spacing) * 1.5);
    }

    challenge-point[dimmed] {
      opacity: 0.25;
    }

    category-footer {
      align-items: center;
      justify-content: center;
      padding-block: 0 calc(var(--spacing) * 2);
      padding-inline: calc(var(--spacing) * 2);

      &[labeled] {
        max-inline-size: var(--score-category-width, var(--score-cell-width));
        gap: calc(var(--spacing) * 1);
        overflow: hidden;
      }

      span {
        overflow: hidden;
        color: var(--category-foreground-l1);
        text-overflow: ellipsis;
        text-transform: capitalize;
        white-space: nowrap;
      }
    }

    :global(.category-icon-trigger) {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--category-foreground-l1);
    }

    :global(.category-icon) {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
      color: var(--category-foreground-l1);
    }

    :global(.category-icon-trigger .category-icon) {
      margin-block: calc(var(--spacing) * 0.5);
    }

    :global(.points-trigger) {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: center;
    }

    span[data-points-badge] {
      width: calc(var(--spacing) * 5);
      height: calc(var(--spacing) * 5);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      color: var(--category-foreground-l1);
      font-size: var(--text-sm);
      line-height: 1;
      opacity: 0.75;

      &[data-dynamic] {
        font-size: var(--text-xs);
      }
    }

    :global(.focus-icon) {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      opacity: 0.5;
      transition: opacity 150ms ease;
    }
  }

  span[data-category-name],
  p[data-category-title] {
    text-transform: capitalize;
  }

  p[data-muted] {
    color: var(--foreground-l3);
  }
</style>
