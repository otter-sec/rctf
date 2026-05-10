<script lang="ts">
  import type { Solve } from '@rctf/types'
  import {
    Accordion,
    CollapseToggleButton,
    EmptyState,
    ScrollArea,
    SearchInput,
    Tooltip,
  } from '$lib/components'
  import {
    IconAwardFilled,
    IconCheck,
    IconClockFilled,
    IconCoinFilled,
    IconEyeClosed,
    IconEyeFilled,
    IconFlagFilled,
    IconZoomQuestionFilled,
  } from '$lib/icons'
  import {
    cn,
    getBloodStyles,
    getCategoryConfig,
    getCategoryKeyOrAlias,
    getCategoryOrder,
    getCategoryStyle,
    type BloodIndex,
  } from '$lib/utils'

  interface ChallengeInfo {
    id: string
    name: string
    category: string
    points: number
    solves: number
  }

  interface Props {
    challenges: ChallengeInfo[]
    solves: Solve[]
    showUnsolved?: boolean
    scrollable?: boolean
    class?: string
  }

  let {
    challenges,
    solves,
    showUnsolved = true,
    scrollable = false,
    class: className = '',
  }: Props = $props()

  const solvedIds = $derived(new Set(solves.map(s => s.id)))
  const solveMap = $derived(new Map(solves.map(s => [s.id, s])))

  let searchQuery = $state('')
  let hideSolved = $state(false)
  let sortMode = $state<'category' | 'time' | 'points'>('category')

  interface DisplayChallenge {
    id: string
    name: string
    category: string
    points: number | null
    solves: number | null
    isSolved: boolean
    solvedAt?: number
    bloodIndex?: number | null
  }

  function formatSolveTime(timestamp: number): string {
    const date = new Date(timestamp)
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const allChallenges: DisplayChallenge[] = $derived.by(() => {
    if (showUnsolved && challenges.length > 0) {
      return challenges.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        points: c.points,
        solves: c.solves,
        isSolved: solvedIds.has(c.id),
        solvedAt: solveMap.get(c.id)?.createdAt,
        bloodIndex: solveMap.get(c.id)?.bloodIndex,
      }))
    }
    return solves.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      points: s.points,
      solves: s.solves,
      isSolved: true,
      solvedAt: s.createdAt,
      bloodIndex: s.bloodIndex,
    }))
  })

  const displayChallenges = $derived.by(() => {
    let filtered = allChallenges

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        c => c.name.toLowerCase().includes(query) || c.category.toLowerCase().includes(query)
      )
    }

    if (hideSolved) {
      filtered = filtered.filter(c => !c.isSolved)
    }

    return filtered
  })

  const sortedChallenges = $derived.by(() => {
    const list = [...displayChallenges]
    if (sortMode === 'time') {
      list.sort((a, b) => {
        if (a.solvedAt && b.solvedAt) return b.solvedAt - a.solvedAt
        if (a.solvedAt) return -1
        if (b.solvedAt) return 1
        return a.name.localeCompare(b.name)
      })
    } else if (sortMode === 'points') {
      list.sort((a, b) => {
        const pointsDiff = (b.points ?? 0) - (a.points ?? 0)
        if (pointsDiff !== 0) return pointsDiff
        return a.name.localeCompare(b.name)
      })
    }
    return list
  })

  const groups = $derived.by(() => {
    const grouped = new Map<string, DisplayChallenge[]>()
    for (const challenge of displayChallenges) {
      const category = challenge.category
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(challenge)
    }
    for (const challs of grouped.values()) {
      challs.sort((a, b) => {
        if (a.isSolved !== b.isSolved) return a.isSolved ? -1 : 1
        if (a.solves !== b.solves) return (b.solves ?? 0) - (a.solves ?? 0)
        return a.name.localeCompare(b.name)
      })
    }
    return Array.from(grouped.entries()).sort((a, b) => {
      const orderA = getCategoryOrder(a[0])
      const orderB = getCategoryOrder(b[0])
      if (orderA === -1 && orderB === -1) return a[0].localeCompare(b[0])
      if (orderA === -1) return 1
      if (orderB === -1) return -1
      return orderA - orderB
    })
  })

  const stats = $derived({
    pointsEarned: allChallenges
      .filter(c => c.isSolved)
      .reduce((sum, c) => sum + (c.points ?? 0), 0),
    pointsTotal: showUnsolved ? allChallenges.reduce((sum, c) => sum + (c.points ?? 0), 0) : null,
    solved: allChallenges.filter(c => c.isSolved).length,
    total: showUnsolved ? allChallenges.length : null,
  })

  let openCategories = $state<string[]>([])
  let hasInitialized = $state(false)

  $effect(() => {
    if (!hasInitialized && groups.length > 0) {
      openCategories = groups.map(([cat]) => cat)
      hasInitialized = true
    }
  })

  const categoryNames = $derived(groups.map(([cat]) => cat))
  function toggleCollapse() {
    if (openCategories.length === 0) {
      openCategories = [...categoryNames]
    } else {
      openCategories = []
    }
  }

  function cycleSortMode() {
    if (sortMode === 'category') sortMode = 'time'
    else if (sortMode === 'time') sortMode = 'points'
    else sortMode = 'category'
  }

  const sortLabel = $derived(
    sortMode === 'category'
      ? 'Sort by category'
      : sortMode === 'time'
        ? 'Sort by time'
        : 'Sort by points'
  )
</script>

<div
  class={cn(
    '@container/list flex flex-col',
    scrollable && 'h-full min-h-0 overflow-hidden',
    className
  )}
>
  <div class="bg-background-l1 flex shrink-0 flex-col gap-2 py-2">
    <div class="flex justify-between px-9">
      <div class="flex gap-1 whitespace-nowrap">
        <span class="text-foreground-l3 text-base tabular-nums">
          {stats.pointsEarned.toLocaleString()}
        </span>
        {#if stats.pointsTotal !== null}
          <span class="text-foreground-l5 text-base">
            / {stats.pointsTotal.toLocaleString()} pts
          </span>
        {:else}
          <span class="text-foreground-l5 text-base">pts</span>
        {/if}
      </div>
      <div class="flex items-baseline gap-1 whitespace-nowrap">
        <span class="text-foreground-l3 text-base tabular-nums">
          {stats.solved}
        </span>
        {#if stats.total !== null}
          <span class="text-foreground-l5 text-base">
            / {stats.total}
          </span>
        {/if}
      </div>
    </div>

    <div class="px-5">
      <div class="flex flex-wrap gap-1">
        <SearchInput
          value={searchQuery}
          onInput={q => (searchQuery = q)}
          class="min-w-0 flex-1 rounded-[20px] py-2 @sm/list:rounded-l-[20px] @sm/list:rounded-r-sm"
        />
        <div class="flex w-full gap-1 @sm/list:w-auto">
          {#if sortMode === 'category'}
            <CollapseToggleButton
              totalCount={categoryNames.length}
              openCount={openCategories.length}
              onToggle={toggleCollapse}
              class="rounded-l-[20px] rounded-r-sm @sm/list:rounded-sm"
            />
          {/if}
          <Tooltip.Root disableCloseOnTriggerClick>
            <Tooltip.Trigger
              type="button"
              onclick={() => (hideSolved = !hideSolved)}
              aria-label={hideSolved ? 'Show solved challenges' : 'Hide solved challenges'}
              class={cn(
                'focus-visible:ring-ring/50 flex h-10 flex-1 items-center justify-center px-4 py-2 outline-none focus-visible:ring-[3px] @sm/list:flex-initial',
                sortMode === 'category'
                  ? 'rounded-sm'
                  : 'rounded-l-[20px] rounded-r-sm @sm/list:rounded-sm',
                hideSolved
                  ? 'bg-background-accent text-foreground-accent hover:bg-background-accent-hover'
                  : 'bg-background-l4 text-foreground-l1 hover:bg-background-l5'
              )}
            >
              {#if hideSolved}
                <IconEyeClosed class="size-5 shrink-0" />
              {:else}
                <IconEyeFilled class="size-5 shrink-0" />
              {/if}
            </Tooltip.Trigger>
            <Tooltip.Content sideOffset={8}>
              {hideSolved ? 'Show solved' : 'Hide solved'}
            </Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root disableCloseOnTriggerClick>
            <Tooltip.Trigger
              type="button"
              onclick={cycleSortMode}
              aria-label={sortLabel}
              class="bg-background-l4 text-foreground-l1 hover:bg-background-l5 focus-visible:ring-ring/50 flex h-10 flex-1 items-center justify-center rounded-l-sm rounded-r-[20px] px-4 py-2 outline-none focus-visible:ring-[3px] @sm/list:flex-initial"
            >
              {#if sortMode === 'category'}
                <IconFlagFilled class="size-5 shrink-0" />
              {:else if sortMode === 'time'}
                <IconClockFilled class="size-5 shrink-0" />
              {:else}
                <IconCoinFilled class="size-5 shrink-0" />
              {/if}
            </Tooltip.Trigger>
            <Tooltip.Content sideOffset={8}>{sortLabel}</Tooltip.Content>
          </Tooltip.Root>
        </div>
      </div>
    </div>
  </div>

  {#if scrollable}
    <ScrollArea
      class="min-h-0 flex-1"
      fadeSize={86}
      fadeColor="background-l1"
      scrollbarYClasses="z-30"
      viewportTabIndex={-1}
    >
      {@render challengeList()}
    </ScrollArea>
  {:else}
    {@render challengeList()}
  {/if}
</div>

{#snippet challengeList()}
  {#if displayChallenges.length === 0}
    <EmptyState
      icon={IconZoomQuestionFilled}
      title="No challenges"
      subtitle={searchQuery ? 'No matches found' : 'No challenge data available'}
    />
  {:else if sortMode === 'category'}
    <Accordion.Root type="multiple" bind:value={openCategories} class="@container/solves-list pb-4">
      {#each groups as [category, entries] (category)}
        {@const config = getCategoryConfig(category)}
        {@const catStyle = getCategoryStyle(config.color)}
        {@const categorySolved = entries.filter(c => c.isSolved).length}
        {@const categoryShort = getCategoryKeyOrAlias(category)}
        <Accordion.Item value={category} class="border-b-0" style={catStyle}>
          <Accordion.Trigger
            class="bg-category-background-l0 py-2 pr-2 pl-0 hover:no-underline"
            headerClass="sticky top-0 z-20 bg-background-l1"
            chevronClass="text-category-foreground-l1"
          >
            {#snippet trailing()}
              <div
                class="flex items-baseline gap-1 text-base font-normal whitespace-nowrap tabular-nums"
              >
                <span class="text-category-foreground-l0">{categorySolved}</span>
                <span class="text-category-foreground-l1">/ {entries.length}</span>
              </div>
            {/snippet}
            <div class="flex items-center">
              <div class="px-2.5">
                <config.icon class="text-category-foreground-l1 size-4" />
              </div>
              <span class="text-category-foreground-l1 text-base font-normal">
                {config.name}
              </span>
            </div>
          </Accordion.Trigger>
          <Accordion.Content class="bg-category-background-l1 pb-0">
            <ul class="flex flex-col">
              {#each entries as challenge (challenge.id)}
                {@const isBlood =
                  challenge.bloodIndex === 0 ||
                  challenge.bloodIndex === 1 ||
                  challenge.bloodIndex === 2}
                {@const bloodStyles = isBlood
                  ? getBloodStyles(challenge.bloodIndex as BloodIndex)
                  : null}
                <li
                  class={cn(
                    'border-category-foreground-l1/10 relative flex w-full flex-col justify-between border-b-2 px-9 py-2 text-left last:border-b-0 @md/solves-list:flex-row @md/solves-list:items-center @md/solves-list:gap-4 @md/solves-list:border-b-0',
                    challenge.isSolved &&
                      !isBlood &&
                      'before:from-foreground-success/20 before:absolute before:inset-y-0 before:left-0 before:w-36 before:bg-linear-to-r before:to-transparent',
                    isBlood &&
                      bloodStyles && [
                        'before:absolute before:inset-y-0 before:left-0 before:w-36 before:bg-linear-to-r before:to-transparent',
                        bloodStyles.gradient,
                      ]
                  )}
                >
                  {#if isBlood}
                    <IconAwardFilled
                      class={cn(
                        'absolute top-1/2 left-2 size-5 -translate-y-1/2',
                        bloodStyles?.iconColor
                      )}
                    />
                  {:else if challenge.isSolved}
                    <IconCheck
                      class="text-foreground-success absolute top-1/2 left-2 size-5 -translate-y-1/2"
                    />
                  {/if}
                  <div class="z-1 flex min-w-0 flex-1 items-center gap-1 truncate text-base">
                    <span class="text-category-foreground-l1">{categoryShort} /</span>
                    <span class="text-category-foreground-l0 truncate">{challenge.name}</span>
                  </div>
                  <div class="z-1 flex shrink-0 items-center justify-end gap-4">
                    {#if challenge.solvedAt}
                      <span
                        class="text-category-foreground-l1 text-base whitespace-nowrap tabular-nums opacity-75"
                      >
                        {formatSolveTime(challenge.solvedAt)}
                      </span>
                    {/if}
                    {#if challenge.points !== null}
                      <span class="text-base whitespace-nowrap tabular-nums">
                        <span class="text-category-foreground-l0">{challenge.points}</span>
                        <span class="text-category-foreground-l1">pts</span>
                      </span>
                    {/if}
                  </div>
                </li>
              {/each}
            </ul>
          </Accordion.Content>
        </Accordion.Item>
      {/each}
    </Accordion.Root>
  {:else}
    <ul class="flex flex-col pb-4">
      {#each sortedChallenges as challenge (challenge.id)}
        {@const config = getCategoryConfig(challenge.category)}
        {@const catStyle = getCategoryStyle(config.color)}
        {@const categoryShort = getCategoryKeyOrAlias(challenge.category)}
        {@const isBlood =
          challenge.bloodIndex === 0 || challenge.bloodIndex === 1 || challenge.bloodIndex === 2}
        {@const bloodStyles = isBlood ? getBloodStyles(challenge.bloodIndex as BloodIndex) : null}
        <li
          style={catStyle}
          class={cn(
            'bg-category-background-l1 relative flex w-full items-center justify-between gap-4 px-9 py-2 text-left',
            challenge.isSolved &&
              !isBlood &&
              'before:from-foreground-success/20 before:absolute before:inset-y-0 before:left-0 before:w-36 before:bg-linear-to-r before:to-transparent',
            isBlood &&
              bloodStyles && [
                'before:absolute before:inset-y-0 before:left-0 before:w-36 before:bg-linear-to-r before:to-transparent',
                bloodStyles.gradient,
              ]
          )}
        >
          {#if isBlood}
            <IconAwardFilled
              class={cn('absolute top-1/2 left-2 size-5 -translate-y-1/2', bloodStyles?.iconColor)}
            />
          {:else if challenge.isSolved}
            <IconCheck
              class="text-foreground-success absolute top-1/2 left-2 size-5 -translate-y-1/2"
            />
          {/if}
          <div class="z-1 flex min-w-0 flex-1 items-center gap-1 truncate text-base">
            <span class="text-category-foreground-l1">{categoryShort} /</span>
            <span class="text-category-foreground-l0 truncate">{challenge.name}</span>
          </div>
          <div class="z-1 flex shrink-0 items-center gap-4">
            {#if challenge.solvedAt}
              <span
                class="text-category-foreground-l1 text-base whitespace-nowrap tabular-nums opacity-75"
              >
                {formatSolveTime(challenge.solvedAt)}
              </span>
            {/if}
            {#if challenge.points !== null}
              <span class="text-base whitespace-nowrap tabular-nums">
                <span class="text-category-foreground-l0">{challenge.points}</span>
                <span class="text-category-foreground-l1">pts</span>
              </span>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}
