<script lang="ts">
  import type { AdminChallenge } from '$lib/api'
  import { Accordion, EmptyState, ScrollArea } from '$lib/components'
  import { IconZoomQuestionFilled } from '$lib/icons'
  import {
    getCategoryConfig,
    getCategoryOrder,
    getCategoryStyle,
  } from '$lib/utils'
  import Header from './admin-chall-list-header.svelte'
  import Item from './admin-chall-list-item.svelte'

  interface Props {
    challenges: AdminChallenge[]
    selectedId: string | null
    isCreatingNew: boolean
    onSelect: (challenge: AdminChallenge | null) => void
    onCreateNew: () => void
  }

  let { challenges, selectedId, isCreatingNew, onSelect, onCreateNew }: Props =
    $props()

  let searchQuery = $state('')
  let openCategories = $state<string[]>([])
  let hasInitialized = $state(false)

  const filteredChallenges = $derived.by(() => {
    if (!searchQuery.trim()) return challenges
    const query = searchQuery.toLowerCase()
    return challenges.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query) ||
        c.author.toLowerCase().includes(query)
    )
  })

  const groups = $derived.by(() => {
    const grouped = new Map<string, AdminChallenge[]>()
    for (const challenge of filteredChallenges) {
      const category = challenge.category
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(challenge)
    }
    for (const challs of grouped.values()) {
      challs.sort((a, b) => a.name.localeCompare(b.name))
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
    challengeCount: challenges.length,
    categoryCount: new Set(challenges.map(c => c.category)).size,
  })

  const emptySubtitle = $derived.by(() => {
    if (searchQuery.trim()) return 'Try a different search term'
    return 'Create your first challenge to get started'
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
    challengeCount={stats.challengeCount}
    categoryCount={stats.categoryCount}
    {searchQuery}
    {isCreatingNew}
    onSearchChange={q => (searchQuery = q)}
    onCollapseAll={() => (openCategories = [])}
    {onCreateNew}
  />

  <ScrollArea class="min-h-0 flex-1" fadeSize={64} fadeColor="background-l1">
    {#if filteredChallenges.length === 0}
      <EmptyState
        icon={IconZoomQuestionFilled}
        title="No challenges found"
        subtitle={emptySubtitle}
      />
    {:else}
      <Accordion.Root type="multiple" bind:value={openCategories} class="pb-4">
        {#each groups as [category, entries] (category)}
          {@const config = getCategoryConfig(category)}
          {@const catStyle = getCategoryStyle(config.color)}
          <Accordion.Item value={category} class="border-b-0" style={catStyle}>
            <Accordion.Trigger
              class="py-2 pr-2 pl-0 hover:no-underline bg-category-background-l0"
              chevronClass="text-category-foreground-l1"
            >
              {#snippet trailing()}
                <div
                  class="flex items-baseline gap-1 text-base font-normal tabular-nums whitespace-nowrap"
                >
                  <span class="text-category-foreground-l0"
                    >{entries.length}</span
                  >
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
                    isSelected={selectedId === challenge.id}
                    onSelect={() => onSelect(challenge)}
                  />
                {/each}
              </ul>
            </Accordion.Content>
          </Accordion.Item>
        {/each}
      </Accordion.Root>
    {/if}
  </ScrollArea>
</div>
