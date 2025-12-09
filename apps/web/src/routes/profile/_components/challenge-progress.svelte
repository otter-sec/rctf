<script lang="ts">
  import type { Challenge, Solve } from '@rctf/types'
  import { Accordion, EmptyState, ScrollArea, SearchInput, Tooltip } from '$lib/components'
  import {
    IconCheck,
    IconClockFilled,
    IconCoins,
    IconEyeClosed,
    IconEyeFilled,
    IconFlagFilled,
    IconFold,
    IconZoomQuestionFilled,
  } from '$lib/icons'
  import {
    cn,
    getCategoryConfig,
    getCategoryKeyOrAlias,
    getCategoryOrder,
    getCategoryStyle,
  } from '$lib/utils'

  interface Props {
    challenges: Challenge[]
    solves: Solve[]
    showUnsolved?: boolean
  }

  let { challenges, solves, showUnsolved = true }: Props = $props()

  const solvedIds = $derived(new Set(solves.map(s => s.id)))
  const solveMap = $derived(new Map(solves.map(s => [s.id, s])))

  let searchQuery = $state('')
  let hideUnsolved = $state(false)
  let sortMode = $state<'category' | 'time' | 'points'>('category')

  interface DisplayChallenge {
    id: string
    name: string
    category: string
    points: number | null
    solves: number | null
    isSolved: boolean
    solvedAt?: number
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

    if (hideUnsolved) {
      filtered = filtered.filter(c => c.isSolved)
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

  function collapseAll() {
    openCategories = []
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

<div class="flex h-[calc(100vh-72px)] flex-col overflow-hidden rounded-t-3xl bg-background-l1">
  <div class="flex shrink-0 flex-col gap-2 py-2">
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
      <div class="flex gap-1 overflow-hidden rounded-full">
        <SearchInput value={searchQuery} onInput={q => (searchQuery = q)} class="py-2" />
        <Tooltip.Root disableCloseOnTriggerClick>
          <Tooltip.Trigger
            onclick={() => (hideUnsolved = !hideUnsolved)}
            aria-label={hideUnsolved ? 'Show unsolved challenges' : 'Hide unsolved challenges'}
            class={cn(
              'rounded-sm px-4 py-2',
              hideUnsolved
                ? 'bg-background-accent text-foreground-accent hover:bg-background-accent-hover'
                : 'bg-background-l4 text-foreground-l1 hover:bg-background-l5'
            )}>
            {#if hideUnsolved}
              <IconEyeClosed class="size-5" />
            {:else}
              <IconEyeFilled class="size-5" />
            {/if}
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            {hideUnsolved ? 'Show unsolved' : 'Hide unsolved'}
          </Tooltip.Content>
        </Tooltip.Root>
        {#if sortMode === 'category'}
          <Tooltip.Root disableCloseOnTriggerClick>
            <Tooltip.Trigger
              onclick={collapseAll}
              aria-label="Collapse all"
              class="rounded-sm bg-background-l4 px-4 py-2 text-foreground-l1 hover:bg-background-l5">
              <IconFold class="size-5" />
            </Tooltip.Trigger>
            <Tooltip.Content sideOffset={8}>Collapse all</Tooltip.Content>
          </Tooltip.Root>
        {/if}
        <Tooltip.Root disableCloseOnTriggerClick>
          <Tooltip.Trigger
            onclick={cycleSortMode}
            aria-label={sortLabel}
            class="rounded-l-sm bg-background-l4 px-4 py-2 text-foreground-l1 hover:bg-background-l5">
            {#if sortMode === 'category'}
              <IconFlagFilled class="size-5" />
            {:else if sortMode === 'time'}
              <IconClockFilled class="size-5" />
            {:else}
              <IconCoins class="size-5" />
            {/if}
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>{sortLabel}</Tooltip.Content>
        </Tooltip.Root>
      </div>
    </div>
  </div>

  <ScrollArea
    class="min-h-0 flex-1"
    fadeSize={86}
    fadeColor="background-l1"
    scrollbarYClasses="z-30"
    scrollbarXClasses="z-30">
    {#if displayChallenges.length === 0}
      <EmptyState
        icon={IconZoomQuestionFilled}
        title="No challenges"
        subtitle={searchQuery ? 'No matches found' : 'No challenge data available'} />
    {:else if sortMode === 'category'}
      <Accordion.Root type="multiple" bind:value={openCategories} class="pb-4">
        {#each groups as [category, entries] (category)}
          {@const config = getCategoryConfig(category)}
          {@const catStyle = getCategoryStyle(config.color)}
          {@const categorySolved = entries.filter(c => c.isSolved).length}
          {@const categoryShort = getCategoryKeyOrAlias(category)}
          <Accordion.Item value={category} class="border-b-0" style={catStyle}>
            <Accordion.Trigger
              class="py-2 pr-2 pl-0 hover:no-underline bg-category-background-l0"
              headerClass="sticky top-0 z-20 bg-background-l1"
              chevronClass="text-category-foreground-l1">
              {#snippet trailing()}
                <div
                  class="flex items-baseline gap-1 text-base font-normal tabular-nums whitespace-nowrap">
                  <span class="text-category-foreground-l0">{categorySolved}</span>
                  <span class="text-category-foreground-l1">/ {entries.length}</span>
                </div>
              {/snippet}
              <div class="flex items-center">
                <div class="px-2.5">
                  <config.icon class="size-4 text-category-foreground-l1" />
                </div>
                <span class="text-base font-normal text-category-foreground-l1">
                  {config.name}
                </span>
              </div>
            </Accordion.Trigger>
            <Accordion.Content class="pb-0 bg-category-background-l1">
              <ul class="flex flex-col">
                {#each entries as challenge (challenge.id)}
                  <li
                    class={cn(
                      'relative flex w-full items-center justify-between px-9 py-2 text-left gap-4',
                      challenge.isSolved &&
                        'before:absolute before:inset-y-0 before:left-0 before:w-36 before:bg-linear-to-r before:from-background-success/50 dark:before:from-foreground-success/20 before:to-transparent'
                    )}>
                    {#if challenge.isSolved}
                      <IconCheck
                        class="absolute left-2 top-1/2 -translate-y-1/2 size-5 text-foreground-success" />
                    {/if}
                    <div class="flex min-w-0 flex-1 items-center gap-1 z-1 truncate text-base">
                      <span class="text-category-foreground-l1">{categoryShort} /</span>
                      <span class="truncate text-category-foreground-l0">{challenge.name}</span>
                    </div>
                    <div class="flex shrink-0 items-center gap-4 z-1">
                      {#if challenge.solvedAt}
                        <span
                          class="text-base tabular-nums text-category-foreground-l1 opacity-75 whitespace-nowrap">
                          {formatSolveTime(challenge.solvedAt)}
                        </span>
                      {/if}
                      {#if challenge.points !== null}
                        <span class="text-base tabular-nums whitespace-nowrap">
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
          <li
            style={catStyle}
            class={cn(
              'relative flex w-full items-center justify-between px-9 py-2 text-left gap-4 bg-category-background-l1',
              challenge.isSolved &&
                'before:absolute before:inset-y-0 before:left-0 before:w-36 before:bg-linear-to-r before:from-background-success/50 dark:before:from-foreground-success/20 before:to-transparent'
            )}>
            {#if challenge.isSolved}
              <IconCheck
                class="absolute left-2 top-1/2 -translate-y-1/2 size-5 text-foreground-success" />
            {/if}
            <div class="flex min-w-0 flex-1 items-center gap-1 z-1 truncate text-base">
              <span class="text-category-foreground-l1">{categoryShort} /</span>
              <span class="truncate text-category-foreground-l0">{challenge.name}</span>
            </div>
            <div class="flex shrink-0 items-center gap-4 z-1">
              {#if challenge.solvedAt}
                <span
                  class="text-base tabular-nums text-category-foreground-l1 opacity-75 whitespace-nowrap">
                  {formatSolveTime(challenge.solvedAt)}
                </span>
              {/if}
              {#if challenge.points !== null}
                <span class="text-base tabular-nums whitespace-nowrap">
                  <span class="text-category-foreground-l0">{challenge.points}</span>
                  <span class="text-category-foreground-l1">pts</span>
                </span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </ScrollArea>
</div>
