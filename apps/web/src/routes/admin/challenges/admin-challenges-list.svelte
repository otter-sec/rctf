<script lang="ts">
  import { Permissions } from '@rctf/types'
  import type { AdminChallenge } from '@rctf/types'
  import { Accordion, EmptyState, ScrollArea, SearchInput, Tooltip } from '$lib/components'
  import { IconFold, IconLibraryPlusFilled, IconZoomQuestionFilled } from '$lib/icons'
  import { useCurrentUser } from '$lib/query'
  import {
    cn,
    getCategoryConfig,
    getCategoryOrder,
    getCategoryStyle,
    hasPermissions,
  } from '$lib/utils'
  import AdminChallengesListItem from './admin-challenges-list-item.svelte'

  interface Props {
    challenges: AdminChallenge[]
    selectedId: string | null
    isCreatingNew: boolean
    onSelect: (challenge: AdminChallenge | null) => void
    onCreateNew: () => void
  }

  let { challenges, selectedId, isCreatingNew, onSelect, onCreateNew }: Props = $props()

  const userQuery = useCurrentUser()
  const canWrite = $derived(hasPermissions($userQuery.data, Permissions.challsWrite))

  let query = $state('')
  let collapsed = $state<Set<string>>(new Set())

  const filtered = $derived.by(() => {
    if (!query.trim()) return challenges
    const q = query.toLowerCase()
    return challenges.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q)
    )
  })

  const groups = $derived.by(() => {
    const map = new Map<string, AdminChallenge[]>()
    for (const c of filtered) {
      if (!map.has(c.category)) map.set(c.category, [])
      map.get(c.category)!.push(c)
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name))
    return [...map.entries()].sort((a, b) => {
      const [oa, ob] = [getCategoryOrder(a[0]), getCategoryOrder(b[0])]
      if (oa === -1 && ob === -1) return a[0].localeCompare(b[0])
      if (oa === -1) return 1
      if (ob === -1) return -1
      return oa - ob
    })
  })

  const categories = $derived(groups.map(([cat]) => cat))
  const open = $derived(query.trim() ? categories : categories.filter(c => !collapsed.has(c)))

  const stats = $derived({
    challs: challenges.length,
    cats: new Set(challenges.map(c => c.category)).size,
  })
</script>

<div class="@container/list flex h-full flex-col overflow-hidden">
  <div class="flex shrink-0 flex-col gap-2 py-2">
    <div class="flex items-baseline justify-between px-9">
      <div class="flex items-baseline gap-1 whitespace-nowrap">
        <span class="text-foreground-l3 text-base tabular-nums">{stats.challs}</span>
        <span class="text-foreground-l5 text-base">challenge{stats.challs === 1 ? '' : 's'}</span>
      </div>
      <div class="flex items-baseline gap-1 whitespace-nowrap">
        <span class="text-foreground-l3 text-base tabular-nums">{stats.cats}</span>
        <span class="text-foreground-l5 text-base">categor{stats.cats === 1 ? 'y' : 'ies'}</span>
      </div>
    </div>

    <div class="px-5">
      <div class="flex flex-wrap gap-1 @sm/list:overflow-hidden @sm/list:rounded-full">
        <SearchInput
          value={query}
          onInput={q => (query = q)}
          class="min-w-0 flex-1 rounded-full py-2 @sm/list:rounded-l-none @sm/list:rounded-r-sm"
        />
        <div
          class="flex w-full gap-1 overflow-hidden rounded-full @sm/list:w-auto @sm/list:overflow-auto @sm/list:rounded-none"
        >
          <Tooltip.Root disableCloseOnTriggerClick>
            <Tooltip.Trigger
              onclick={() => (collapsed = new Set(categories))}
              aria-label="Collapse all"
              class="bg-background-l4 text-foreground-l1 hover:bg-background-l5 flex flex-1 items-center justify-center rounded-sm px-4 py-2 @sm/list:flex-initial"
            >
              <IconFold class="size-5 shrink-0" />
            </Tooltip.Trigger>
            <Tooltip.Content sideOffset={8}>Collapse all</Tooltip.Content>
          </Tooltip.Root>
          {#if canWrite}
            <Tooltip.Root disableCloseOnTriggerClick>
              <Tooltip.Trigger
                onclick={onCreateNew}
                aria-label="New challenge"
                class={cn(
                  'flex flex-1 items-center justify-center rounded-sm px-4 py-2 @sm/list:flex-initial',
                  isCreatingNew
                    ? 'bg-background-accent text-foreground-accent hover:bg-background-accent-hover'
                    : 'bg-background-l4 text-foreground-l1 hover:bg-background-l5'
                )}
              >
                <IconLibraryPlusFilled class="size-5 shrink-0" />
              </Tooltip.Trigger>
              <Tooltip.Content sideOffset={8}>New challenge</Tooltip.Content>
            </Tooltip.Root>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <ScrollArea
    class="min-h-0 flex-1"
    fadeSize={86}
    fadeColor="background-l1"
    scrollbarYClasses="z-30"
    scrollbarXClasses="z-30"
  >
    {#if !filtered.length}
      <EmptyState
        icon={IconZoomQuestionFilled}
        title="No challenges found"
        subtitle={query.trim()
          ? 'Try a different search term'
          : 'Create your first challenge to get started'}
      />
    {:else}
      <Accordion.Root
        type="multiple"
        value={open}
        onValueChange={vals => (collapsed = new Set(categories.filter(c => !vals.includes(c))))}
        class="pb-4"
      >
        {#each groups as [category, entries] (category)}
          {@const cfg = getCategoryConfig(category)}
          <Accordion.Item value={category} class="border-b-0" style={getCategoryStyle(cfg.color)}>
            <Accordion.Trigger
              class="bg-category-background-l0 py-2 pr-2 pl-0 hover:no-underline"
              headerClass="sticky top-0 z-20 bg-background-l1"
              chevronClass="text-category-foreground-l1"
            >
              {#snippet trailing()}
                <div
                  class="flex items-baseline gap-1 text-base font-normal whitespace-nowrap tabular-nums"
                >
                  <span class="text-category-foreground-l0">{entries.length}</span>
                </div>
              {/snippet}
              <div class="flex items-center">
                <div class="px-2.5">
                  <cfg.icon class="text-category-foreground-l1 size-4" />
                </div>
                <span class="text-category-foreground-l1 text-base font-normal">{cfg.name}</span>
              </div>
            </Accordion.Trigger>
            <Accordion.Content class="bg-category-background-l1 pb-0">
              <ul class="flex flex-col">
                {#each entries as challenge (challenge.id)}
                  <AdminChallengesListItem
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
