<script lang="ts">
  import type { Challenge } from '$lib/api'
  import { Accordion, EmptyState, ScrollArea } from '$lib/components'
  import { IconZoomQuestionFilled } from '$lib/icons'
  import { getCategoryConfig, getCategoryOrder, getCategoryStyle } from '$lib/utils'
  import Header from './list-header.svelte'
  import Item from './list-item.svelte'

  interface Props {
    challenges: Challenge[]
    solvedIds: Set<string>
    firstBloodIds: Set<string>
    selectedId: string | null
    onSelect: (challenge: Challenge) => void
  }

  let { challenges, solvedIds, firstBloodIds, selectedId, onSelect }: Props = $props()

  let searchQuery = $state('')
  let hideSolved = $state(false)
  let openCategories = $state<string[]>([])
  let hasInitialized = $state(false)

  const filteredChallenges = $derived.by(() => {
    let filtered = challenges
    if (hideSolved) {
      filtered = filtered.filter(c => !solvedIds.has(c.id))
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query) ||
          c.author.toLowerCase().includes(query)
      )
    }
    return filtered
  })

  const groups = $derived.by(() => {
    const grouped = new Map<string, Challenge[]>()
    for (const challenge of filteredChallenges) {
      const category = challenge.category
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(challenge)
    }
    for (const challs of grouped.values()) {
      challs.sort((a, b) => {
        if (a.solves !== b.solves) {
          return (b.solves ?? 0) - (a.solves ?? 0)
        }
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
    pointsEarned: challenges
      .filter(c => solvedIds.has(c.id))
      .reduce((sum, c) => sum + (c.points ?? 0), 0),
    pointsTotal: challenges.reduce((sum, c) => sum + (c.points ?? 0), 0),
    solved: challenges.filter(c => solvedIds.has(c.id)).length,
    total: challenges.length,
  })

  const emptySubtitle = $derived.by(() => {
    if (searchQuery.trim() && hideSolved) return 'Try a different search or show solved challenges'
    if (searchQuery.trim()) return 'Try a different search term'
    if (hideSolved) return 'All challenges have been solved!'
    return 'No challenges available'
  })

  $effect(() => {
    if (!hasInitialized && groups.length > 0) {
      openCategories = groups.map(([cat]) => cat)
      hasInitialized = true
    }
  })

  $effect(() => {
    if (searchQuery.trim() && groups.length > 0) {
      openCategories = groups.map(([cat]) => cat)
    }
  })
</script>

<div class="flex h-full flex-col overflow-hidden">
  <Header
    pointsEarned={stats.pointsEarned}
    pointsTotal={stats.pointsTotal}
    solved={stats.solved}
    total={stats.total}
    {searchQuery}
    {hideSolved}
    onSearchChange={q => (searchQuery = q)}
    onToggleHideSolved={() => (hideSolved = !hideSolved)}
    onCollapseAll={() => (openCategories = [])} />

  <ScrollArea class="min-h-0 flex-1" fadeSize={64} fadeColor="background-l1">
    {#if filteredChallenges.length === 0}
      <EmptyState
        icon={IconZoomQuestionFilled}
        title="No challenges found"
        subtitle={emptySubtitle} />
    {:else}
      <Accordion.Root type="multiple" bind:value={openCategories} class="pb-4">
        {#each groups as [category, entries] (category)}
          {@const config = getCategoryConfig(category)}
          {@const catStyle = getCategoryStyle(config.color)}
          {@const categorySolved = entries.filter(c => solvedIds.has(c.id)).length}
          <Accordion.Item value={category} class="border-b-0" style={catStyle}>
            <Accordion.Trigger
              class="py-2 pr-2 pl-0 hover:no-underline bg-category-background-l0"
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
              <ul class="@container flex flex-col">
                {#each entries as challenge (challenge.id)}
                  <Item
                    {challenge}
                    {category}
                    isSolved={solvedIds.has(challenge.id)}
                    isFirstBlood={firstBloodIds.has(challenge.id)}
                    isSelected={selectedId === challenge.id}
                    onSelect={() => onSelect(challenge)} />
                {/each}
              </ul>
            </Accordion.Content>
          </Accordion.Item>
        {/each}
      </Accordion.Root>
    {/if}
  </ScrollArea>
</div>
