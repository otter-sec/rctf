<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { getCategoryStyle } from '$lib/utils/categories'
  import type { CategoryGroup, ChallengeInfo, SortMode, ViewMode } from './types'

  interface Props {
    viewMode: ViewMode
    sortMode: SortMode
    categoryGroups: CategoryGroup[]
    challenges: ChallengeInfo[]
  }

  let { viewMode, sortMode, categoryGroups, challenges }: Props = $props()

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
  <div class="relative w-12 translate-x-1" style={getCategoryStyle(item.config.color)}>
    <span
      class="text-category-foreground-l1 absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg"
      class:capitalize={isCategory}
    >
      {isCategory ? (item as CategoryGroup).config.name : (item as ChallengeInfo).name}
    </span>
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

{#if viewMode !== 'minimal'}
  <div class="mr-(--diagonal-overflow) flex flex-col">
    <!-- Name labels row -->
    <div
      class="flex h-(--name-row-height) items-end [&>div]:h-(--name-row-height)"
      class:gap-1={viewMode === 'challenges'}
    >
      {#each headerItems as itemGroup}
        <div class="flex translate-x-1 gap-1">
          {#each itemGroup as item}
            {#if item.type === 'category'}
              {@render challengeNameLabel(item.group, true)}
            {:else}
              {@render challengeNameLabel(item.challenge, false)}
            {/if}
          {/each}
        </div>
      {/each}
    </div>

    <!-- Points + icons row -->
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
          <div
            class="bg-category-background-l0 before:bg-background-l0 relative flex flex-col rounded-t-lg before:absolute before:inset-0 before:-z-10 before:rounded-t-lg"
            style={getCategoryStyle(group.config.color)}
          >
            <div class="flex gap-1 py-1.5">
              {#each group.challenges as challenge}
                {@render pointsBadge(challenge.points, {
                  title: challenge.name,
                  subtitle: `${challenge.points} pts · ${challenge.solves} solve${challenge.solves !== 1 ? 's' : ''}`,
                })}
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
          <div
            class="bg-category-background-l0 before:bg-background-l0 relative flex flex-col rounded-t-lg before:absolute before:inset-0 before:-z-10 before:rounded-t-lg"
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
{/if}
