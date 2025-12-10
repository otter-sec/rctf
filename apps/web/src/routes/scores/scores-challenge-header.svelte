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
</script>

{#if viewMode !== 'minimal'}
  <div class="mr-(--diagonal-overflow) flex flex-col">
    <div
      class="flex h-(--name-row-height) items-end [&>div]:h-(--name-row-height)"
      class:gap-1={viewMode === 'challenges'}
    >
      {#if viewMode === 'categories'}
        <div class="flex translate-x-1 gap-1">
          {#each categoryGroups as group}
            <div class="relative w-12" style={getCategoryStyle(group.config.color)}>
              <span
                class="text-category-foreground-l1 absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg capitalize"
              >
                {group.config.name}
              </span>
            </div>
          {/each}
        </div>
      {:else if sortMode === 'categories'}
        {#each categoryGroups as group}
          <div class="flex translate-x-1 gap-1">
            {#each group.challenges as challenge}
              <div class="relative w-12" style={getCategoryStyle(challenge.config.color)}>
                <span
                  class="text-category-foreground-l1 absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg"
                >
                  {challenge.name}
                </span>
              </div>
            {/each}
          </div>
        {/each}
      {:else}
        {#each challenges as challenge}
          <div class="relative w-12 translate-x-1" style={getCategoryStyle(challenge.config.color)}>
            <span
              class="text-category-foreground-l1 absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg"
            >
              {challenge.name}
            </span>
          </div>
        {/each}
      {/if}
    </div>

    <div class="ml-1 flex items-stretch" class:gap-1={viewMode === 'challenges'}>
      {#if viewMode === 'categories'}
        <div class="flex gap-1">
          {#each categoryGroups as group}
            {@const Icon = group.config.icon}
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
                <Tooltip.Root>
                  <Tooltip.Trigger
                    class="text-category-foreground-l1 flex items-center justify-center"
                  >
                    <Icon class="my-0.5 size-5" />
                  </Tooltip.Trigger>
                  <Tooltip.Content side="bottom" sideOffset={4}>
                    <span class="capitalize">{group.config.name}</span>
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
            </div>
          {/each}
        </div>
      {:else if sortMode === 'categories'}
        {#each categoryGroups as group}
          {@const Icon = group.config.icon}
          <div
            class="bg-category-background-l0 before:bg-background-l0 relative flex flex-col rounded-t-lg before:absolute before:inset-0 before:-z-10 before:rounded-t-lg"
            style={getCategoryStyle(group.config.color)}
          >
            <div class="flex gap-1 py-1.5">
              {#each group.challenges as challenge}
                <Tooltip.Root>
                  <Tooltip.Trigger class="flex w-12 items-center justify-center">
                    <span
                      class="bg-category-background-l1 text-category-foreground-l1 flex size-5 items-center justify-center rounded text-sm leading-none opacity-75"
                    >
                      {challenge.points}
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content side="bottom" sideOffset={4}>
                    <p>{challenge.name}</p>
                    <p class="text-foreground-l3">
                      {challenge.points} pts · {challenge.solves} solve{challenge.solves !== 1
                        ? 's'
                        : ''}
                    </p>
                  </Tooltip.Content>
                </Tooltip.Root>
              {/each}
            </div>
            <div
              class="flex items-center justify-center gap-1 overflow-hidden px-2 pb-2"
              style:max-width="{group.challenges.length * 48}px"
            >
              {#if group.challenges.length > 1}
                <Icon class="text-category-foreground-l1 size-5 shrink-0" />
                <span class="text-category-foreground-l1 truncate capitalize"
                  >{group.config.name}</span
                >
              {:else}
                <Tooltip.Root>
                  <Tooltip.Trigger
                    class="text-category-foreground-l1 flex items-center justify-center"
                  >
                    <Icon class="my-0.5 size-5" />
                  </Tooltip.Trigger>
                  <Tooltip.Content side="bottom" sideOffset={4}>
                    <span class="capitalize">{group.config.name}</span>
                  </Tooltip.Content>
                </Tooltip.Root>
              {/if}
            </div>
          </div>
        {/each}
      {:else}
        {#each challenges as challenge}
          {@const Icon = challenge.config.icon}
          <div
            class="bg-category-background-l0 before:bg-background-l0 relative flex flex-col rounded-t-lg before:absolute before:inset-0 before:-z-10 before:rounded-t-lg"
            style={getCategoryStyle(challenge.config.color)}
          >
            <div class="flex py-1.5">
              <Tooltip.Root>
                <Tooltip.Trigger class="flex w-12 items-center justify-center">
                  <span
                    class="bg-category-background-l1 text-category-foreground-l1 flex size-5 items-center justify-center rounded text-sm leading-none opacity-75"
                  >
                    {challenge.points}
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" sideOffset={4}>
                  <p>{challenge.name}</p>
                  <p class="text-foreground-l3">
                    {challenge.points} pts · {challenge.solves} solve{challenge.solves !== 1
                      ? 's'
                      : ''}
                  </p>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <div class="flex items-center justify-center px-2 pb-2">
              <Tooltip.Root>
                <Tooltip.Trigger
                  class="text-category-foreground-l1 flex items-center justify-center"
                >
                  <Icon class="my-0.5 size-5" />
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" sideOffset={4}>
                  <span class="capitalize">{challenge.config.name}</span>
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}
