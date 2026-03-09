<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconX } from '$lib/icons'
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import type { CategoryGroup, ChallengeInfo, SortMode, ViewMode } from './types'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    categoryGroups: CategoryGroup[]
    challenges: ChallengeInfo[]
    focusedChallengeId: string | null
    onChallengeFocus: (id: string) => void
  }

  let { viewMode, sortMode, categoryGroups, challenges, focusedChallengeId, onChallengeFocus }: Props = $props()

  type HeaderItem =
    | { type: 'category'; group: CategoryGroup }
    | { type: 'challenge'; challenge: ChallengeInfo; isFirst?: boolean }

  const headerItems = $derived.by((): HeaderItem[][] => {
    if (viewMode === 'categories') {
      return [categoryGroups.map(group => ({ type: 'category' as const, group }))]
    }
    if (sortMode === 'categories') {
      return categoryGroups.map(group =>
        group.challenges.map((challenge, i) => ({
          type: 'challenge' as const,
          challenge,
          isFirst: i === 0,
        }))
      )
    }
    return [challenges.map(challenge => ({ type: 'challenge' as const, challenge }))]
  })
</script>

{#snippet challengeNameLabel(item: ChallengeInfo | CategoryGroup, isCategory: boolean)}
  {@const isFocused = !isCategory && focusedChallengeId === (item as ChallengeInfo).id}
  {@const isDimmed = !isCategory && focusedChallengeId !== null && !isFocused}
  <div
    class={cn('relative w-12 translate-x-1 overflow-visible', isDimmed && 'opacity-25')}
    style={getCategoryStyle(item.config.color)}
  >
    {#if !isCategory}
      <button
        class="text-category-foreground-l1 absolute bottom-0 left-1/2 flex max-w-[150px] cursor-pointer items-center gap-1 origin-bottom-left -rotate-45 text-lg"
        title={(item as ChallengeInfo).name}
        onclick={() => onChallengeFocus((item as ChallengeInfo).id)}
      >
        <span class="truncate">{(item as ChallengeInfo).name}</span>
        {#if isFocused}
          <IconX class="size-4 shrink-0" />
        {/if}
      </button>
    {:else}
      <span
        class="text-category-foreground-l1 absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg capitalize"
      >
        {(item as CategoryGroup).config.name}
      </span>
    {/if}
  </div>
{/snippet}

{#snippet categoryIcon(group: CategoryGroup, showLabel: boolean = false)}
  {@const Icon = group.config.icon}
  {#if showLabel && group.challenges.length > 1}
    <Icon class="text-category-foreground-l1 size-5 shrink-0" />
    <span class="text-category-foreground-l1 truncate capitalize">{group.config.name}</span>
  {:else}
    <Tooltip.Root>
      <Tooltip.Trigger class="text-category-foreground-l1 flex items-center justify-center">
        <Icon class="my-0.5 size-5" />
      </Tooltip.Trigger>
      <Tooltip.Content side="bottom" sideOffset={4}>
        <span class="capitalize">{group.config.name}</span>
      </Tooltip.Content>
    </Tooltip.Root>
  {/if}
{/snippet}

{#snippet pointsBadge(points: number, tooltipContent?: { title: string; subtitle: string })}
  {#if tooltipContent}
    <Tooltip.Root>
      <Tooltip.Trigger class="flex w-12 items-center justify-center">
        <span
          class="bg-category-background-l1 text-category-foreground-l1 flex size-5 items-center justify-center rounded text-sm leading-none opacity-75"
        >
          {points}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content side="bottom" sideOffset={4}>
        <p>{tooltipContent.title}</p>
        <p class="text-foreground-l3">{tooltipContent.subtitle}</p>
      </Tooltip.Content>
    </Tooltip.Root>
  {:else}
    <span
      class="bg-category-background-l1 text-category-foreground-l1 flex size-5 items-center justify-center rounded text-sm leading-none opacity-75"
    >
      {points}
    </span>
  {/if}
{/snippet}

<div class="mr-(--diagonal-overflow) flex flex-col">
  <div
    class="flex h-(--name-row-height) flex-row-reverse translate-x-1 items-end justify-end overflow-visible [&>div]:h-(--name-row-height)"
    class:gap-1={viewMode === 'challenges'}
  >
    {#each [...headerItems].reverse() as itemGroup}
      {#each [...itemGroup].reverse() as item}
        {#if item.type === 'category'}
          {@render challengeNameLabel(item.group, true)}
        {:else}
          {@render challengeNameLabel(item.challenge, false)}
        {/if}
      {/each}
    {/each}
  </div>

  <div class="ml-1 flex items-stretch" class:gap-1={viewMode === 'challenges'}>
    {#if viewMode === 'categories'}
      <div class="flex gap-1">
        {#each categoryGroups as group}
          {@const totalPoints = group.challenges.reduce((s, c) => s + c.points, 0)}
          <div
            class="bg-category-background-l0 before:bg-background-l0 relative flex flex-col rounded-t-lg before:absolute before:inset-0 before:-z-10 before:rounded-t-lg"
            style={getCategoryStyle(group.config.color)}
          >
            <Tooltip.Root>
              <Tooltip.Trigger class="flex w-12 items-center justify-center py-1.5">
                <span
                  class="bg-category-background-l1 text-category-foreground-l1 flex size-5 items-center justify-center rounded text-sm leading-none opacity-75"
                >
                  {totalPoints}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom" sideOffset={4}>
                <p class="capitalize">{group.config.name}</p>
                <p class="text-foreground-l3">
                  {group.challenges.length} challenge{group.challenges.length !== 1 ? 's' : ''} · {totalPoints}
                  pts
                </p>
              </Tooltip.Content>
            </Tooltip.Root>
            <div class="flex items-center justify-center px-2 pb-2">
              {@render categoryIcon(group)}
            </div>
          </div>
        {/each}
      </div>
    {:else if sortMode === 'categories'}
      {#each categoryGroups as group}
        {@const groupHasFocused = focusedChallengeId !== null && group.challenges.some(c => c.id === focusedChallengeId)}
        {@const groupIsDimmed = focusedChallengeId !== null && !groupHasFocused}
        <div
          class={cn(
            'bg-category-background-l0 before:bg-background-l0 relative flex flex-col rounded-t-lg before:absolute before:inset-0 before:-z-10 before:rounded-t-lg',
            groupIsDimmed && 'opacity-25'
          )}
          style={getCategoryStyle(group.config.color)}
        >
          <div class="flex gap-1 py-1.5">
            {#each group.challenges as challenge}
              {@const isDimmed = focusedChallengeId !== null && focusedChallengeId !== challenge.id}
              <div class={cn(isDimmed && !groupIsDimmed && 'opacity-25')}>
                {@render pointsBadge(challenge.points, {
                  title: challenge.name,
                  subtitle: `${challenge.points} pts · ${challenge.solves} solve${challenge.solves !== 1 ? 's' : ''}`,
                })}
              </div>
            {/each}
          </div>
          <div
            class="flex items-center justify-center gap-1 overflow-hidden px-2 pb-2"
            style:max-width="{group.challenges.length * 48}px"
          >
            {@render categoryIcon(group, true)}
          </div>
        </div>
      {/each}
    {:else}
      {#each challenges as challenge}
        {@const isFocused = focusedChallengeId === challenge.id}
        {@const isDimmed = focusedChallengeId !== null && !isFocused}
        <div
          class={cn(
            'bg-category-background-l0 before:bg-background-l0 relative flex flex-col rounded-t-lg before:absolute before:inset-0 before:-z-10 before:rounded-t-lg',
            isDimmed && 'opacity-25'
          )}
          style={getCategoryStyle(challenge.config.color)}
        >
          <div class="flex py-1.5">
            {@render pointsBadge(challenge.points, {
              title: challenge.name,
              subtitle: `${challenge.points} pts · ${challenge.solves} solve${challenge.solves !== 1 ? 's' : ''}`,
            })}
          </div>
          <div class="flex items-center justify-center px-2 pb-2">
            {@render categoryIcon({
              config: challenge.config,
              category: challenge.category,
              challenges: [],
            })}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
