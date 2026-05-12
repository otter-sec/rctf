<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconX } from '$lib/icons'
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import { mergeProps } from 'bits-ui'
  import type { CategoryGroup, ChallengeInfo, SortMode, ViewMode } from './types'

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
    | { type: 'challenge'; challenge: ChallengeInfo; isFirst?: boolean }

  type HeaderTooltipPayload = {
    title: string
    subtitle?: string
    capitalizeTitle?: boolean
  }

  const tooltipTether = Tooltip.createTether<HeaderTooltipPayload>()

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

  const headerNameItems = $derived(headerItems.flat())

  function challengeSubtitle(challenge: ChallengeInfo) {
    return `${challenge.points} pts \u00b7 ${challenge.solves} solve${challenge.solves !== 1 ? 's' : ''}`
  }
</script>

{#snippet challengeNameLabel(
  item: ChallengeInfo | CategoryGroup,
  isCategory: boolean,
  stackIndex: number
)}
  {@const isFocused = !isCategory && focusedChallengeId === (item as ChallengeInfo).id}
  {@const isDimmed = !isCategory && focusedChallengeId !== null && !isFocused}
  <div
    class={cn('relative w-12 translate-x-1 overflow-visible', isDimmed && 'opacity-25')}
    style="{getCategoryStyle(item.config.color)} z-index: {stackIndex};"
  >
    {#if !isCategory}
      {@const challenge = item as ChallengeInfo}
      <Tooltip.Trigger tether={tooltipTether} payload={{ title: challenge.name }}>
        {#snippet child({ props })}
          {@const buttonProps = mergeProps(props, {
            onclick: () => onChallengeFocus(challenge.id),
          })}
          <button
            {...buttonProps}
            type="button"
            class="group/focus text-category-foreground-l1 focus-visible:ring-ring/50 ring-offset-background-l0 absolute bottom-0 left-1/2 flex max-w-37.5 origin-bottom-left -rotate-45 cursor-pointer items-center gap-1 rounded-sm text-lg leading-none ring-offset-3 transition-transform outline-none hover:translate-x-[1.5px] hover:translate-y-[-1.5px] hover:underline focus-visible:ring-[3px]"
          >
            <span class="truncate">{challenge.name}</span>
            {#if isFocused}
              <IconX
                class="size-4 shrink-0 opacity-50 transition-opacity group-hover/focus:opacity-100"
              />
            {/if}
          </button>
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
          <span
            {...props}
            class="text-category-foreground-l1 absolute bottom-0 left-1/2 max-w-37.5 origin-bottom-left -rotate-45 truncate text-lg capitalize"
          >
            {group.config.name}
          </span>
        {/snippet}
      </Tooltip.Trigger>
    {/if}
  </div>
{/snippet}

{#snippet categoryIcon(group: CategoryGroup, showLabel: boolean = false)}
  {@const Icon = group.config.icon}
  {#if showLabel && group.challenges.length > 1}
    <Icon class="text-category-foreground-l1 size-5 shrink-0" />
    <span class="text-category-foreground-l1 truncate capitalize">{group.config.name}</span>
  {:else}
    <Tooltip.Trigger
      tether={tooltipTether}
      payload={{ title: group.config.name, capitalizeTitle: true }}
      tabindex={-1}
      class="text-category-foreground-l1 flex items-center justify-center"
    >
      <Icon class="my-0.5 size-5" />
    </Tooltip.Trigger>
  {/if}
{/snippet}

{#snippet pointsBadge(points: number, tooltipContent?: HeaderTooltipPayload)}
  {#if tooltipContent}
    <Tooltip.Trigger
      tether={tooltipTether}
      payload={tooltipContent}
      tabindex={-1}
      class="flex w-12 items-center justify-center"
    >
      <span
        class="bg-category-background-l1 text-category-foreground-l1 flex size-5 items-center justify-center rounded text-sm leading-none opacity-75"
      >
        {points}
      </span>
    </Tooltip.Trigger>
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
    class="flex h-(--name-row-height) translate-x-1 items-end justify-start gap-1 overflow-visible [&>div]:h-(--name-row-height)"
  >
    {#each headerNameItems as item, index}
      {#if item.type === 'category'}
        {@render challengeNameLabel(item.group, true, headerNameItems.length - index)}
      {:else}
        {@render challengeNameLabel(item.challenge, false, headerNameItems.length - index)}
      {/if}
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
            <div class="py-1.5">
              {@render pointsBadge(totalPoints, {
                title: group.config.name,
                subtitle: `${group.challenges.length} challenge${group.challenges.length !== 1 ? 's' : ''} \u00b7 ${totalPoints} pts`,
                capitalizeTitle: true,
              })}
            </div>
            <div class="flex items-center justify-center px-2 pb-2">
              {@render categoryIcon(group)}
            </div>
          </div>
        {/each}
      </div>
    {:else if sortMode === 'categories'}
      {#each categoryGroups as group}
        {@const groupHasFocused =
          focusedChallengeId !== null && group.challenges.some(c => c.id === focusedChallengeId)}
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
                  subtitle: challengeSubtitle(challenge),
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
              subtitle: challengeSubtitle(challenge),
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

<Tooltip.Root tether={tooltipTether}>
  {#snippet children({ payload })}
    {#if payload}
      <Tooltip.Content side="bottom" sideOffset={4}>
        <p class:capitalize={payload.capitalizeTitle}>{payload.title}</p>
        {#if payload.subtitle}
          <p class="text-foreground-l3">{payload.subtitle}</p>
        {/if}
      </Tooltip.Content>
    {/if}
  {/snippet}
</Tooltip.Root>
