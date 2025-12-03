<script lang="ts">
  import { Permissions } from '@rctf/types'
  import type { AdminChallenge } from '$lib/api'
  import { Accordion, EmptyState, ScrollArea, SearchInput, Tooltip } from '$lib/components'
  import { IconFold, IconLibraryPlusFilled, IconZoomQuestionFilled } from '$lib/icons'
  import { useCurrentUser } from '$lib/query'
  import {
    cn,
    getCategoryConfig,
    getCategoryOrder,
    getCategoryStyle,
  } from '$lib/utils'
  import { hasPermissions } from '$lib/utils/permissions'
  import Item from './list-item.svelte'

  interface Props {
    challenges: AdminChallenge[]
    selectedId: string | null
    isCreatingNew: boolean
    onSelect: (challenge: AdminChallenge | null) => void
    onCreateNew: () => void
  }

  let { challenges, selectedId, isCreatingNew, onSelect, onCreateNew }: Props =
    $props()

  const userQuery = useCurrentUser()
  const user = $derived($userQuery.data)
  const hasWritePerms = $derived(hasPermissions(user, Permissions.challsWrite))

  let searchQuery = $state('')

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

  const allCategoryNames = $derived(groups.map(([cat]) => cat))

  let userCollapsedCategories = $state<Set<string>>(new Set())

  const openCategories = $derived(
    searchQuery.trim()
      ? allCategoryNames
      : allCategoryNames.filter(cat => !userCollapsedCategories.has(cat))
  )

  function handleCategoryToggle(values: string[]) {
    const newCollapsed = new Set<string>()
    for (const cat of allCategoryNames) {
      if (!values.includes(cat)) newCollapsed.add(cat)
    }
    userCollapsedCategories = newCollapsed
  }

  function collapseAll() {
    userCollapsedCategories = new Set(allCategoryNames)
  }

  const stats = $derived({
    challengeCount: challenges.length,
    categoryCount: new Set(challenges.map(c => c.category)).size,
  })

  const emptySubtitle = $derived(
    searchQuery.trim()
      ? 'Try a different search term'
      : 'Create your first challenge to get started'
  )
</script>

<div class="flex h-full flex-col overflow-hidden">
  <div class="flex shrink-0 flex-col gap-2 py-2">
    <div class="flex items-baseline justify-between px-9">
      <div class="flex items-baseline gap-1 whitespace-nowrap">
        <span class="text-foreground-l3 text-base tabular-nums">
          {stats.challengeCount}
        </span>
        <span class="text-foreground-l5 text-base">
          challenge{stats.challengeCount === 1 ? '' : 's'}
        </span>
      </div>
      <div class="flex items-baseline gap-1 whitespace-nowrap">
        <span class="text-foreground-l3 text-base tabular-nums">
          {stats.categoryCount}
        </span>
        <span class="text-foreground-l5 text-base">
          categor{stats.categoryCount === 1 ? 'y' : 'ies'}
        </span>
      </div>
    </div>

    <div class="px-5">
      <div class="flex gap-1 overflow-hidden rounded-full">
        <SearchInput value={searchQuery} onInput={q => (searchQuery = q)} class="py-2" />
        <Tooltip.Root disableCloseOnTriggerClick>
          <Tooltip.Trigger
            onclick={collapseAll}
            aria-label="Collapse all"
            class="rounded-sm bg-background-l2 px-4 py-2 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1"
          >
            <IconFold class="size-5" />
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>Collapse all</Tooltip.Content>
        </Tooltip.Root>
        {#if hasWritePerms}
          <Tooltip.Root disableCloseOnTriggerClick>
            <Tooltip.Trigger
              onclick={onCreateNew}
              aria-label="New challenge"
              class={cn(
                'rounded-l-sm px-4 py-2',
                isCreatingNew
                  ? 'bg-background-accent hover:bg-background-accent-hover text-foreground-accent'
                  : 'bg-background-l2 hover:bg-background-l3 text-foreground-l2 hover:text-foreground-l1'
              )}
            >
              <IconLibraryPlusFilled class="size-5" />
            </Tooltip.Trigger>
            <Tooltip.Content sideOffset={8}>New challenge</Tooltip.Content>
          </Tooltip.Root>
        {/if}
      </div>
    </div>
  </div>

  <ScrollArea class="min-h-0 flex-1" fadeSize={64} fadeColor="background-l1">
    {#if filteredChallenges.length === 0}
      <EmptyState
        icon={IconZoomQuestionFilled}
        title="No challenges found"
        subtitle={emptySubtitle}
      />
    {:else}
      <Accordion.Root type="multiple" value={openCategories} onValueChange={handleCategoryToggle} class="pb-4">
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
