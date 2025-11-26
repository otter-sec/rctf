<script lang="ts">
  import type { Challenge } from '$lib/api'
  import { Accordion, Badge, ScrollArea, Tooltip } from '$lib/components'
  import { IconCheckFilled, IconEye, IconEyeClosed, IconFold, IconSearch } from '$lib/icons'
  import { cn } from '$lib/utils'

  type Props = {
    challenges: Challenge[]
    solvedIds: Set<string>
    selectedId: string | null
    onSelect: (challenge: Challenge) => void
  }

  let { challenges, solvedIds, selectedId, onSelect }: Props = $props()

  let searchQuery = $state('')
  let hideSolved = $state(false)

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
          c.category.toLowerCase().includes(query)
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
        return (b.sortWeight ?? 0) - (a.sortWeight ?? 0)
      })
    }
    return Array.from(grouped.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    )
  })

  const stats = $derived({
    pointsEarned: challenges
      .filter(c => solvedIds.has(c.id))
      .reduce((sum, c) => sum + (c.points ?? 0), 0),
    pointsTotal: challenges.reduce((sum, c) => sum + (c.points ?? 0), 0),
    solved: challenges.filter(c => solvedIds.has(c.id)).length,
    total: challenges.length,
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
</script>

<div class="flex h-full flex-col overflow-hidden">
  <div class="flex shrink-0 flex-col gap-2 py-2">
    <div class="flex items-baseline justify-between px-9">
      <div class="flex items-baseline gap-1">
        <span class="text-foreground-l3 text-base tabular-nums">
          {stats.pointsEarned.toLocaleString()}
        </span>
        <span class="text-foreground-l5 text-base">
          / {stats.pointsTotal.toLocaleString()} pts
        </span>
      </div>
      <div class="flex items-baseline gap-1">
        <span class="text-foreground-l3 text-base tabular-nums">
          {stats.solved}
        </span>
        <span class="text-foreground-l5 text-base">
          / {stats.total}
        </span>
      </div>
    </div>

    <div class="px-5">
      <div class="flex gap-1 overflow-hidden rounded-full">
        <div class="rounded-r-sm flex flex-1 items-center justify-between bg-background-l3 px-4 py-2">
          <input
            type="text"
            placeholder="Search..."
            class="w-full bg-transparent text-base outline-none placeholder:text-foreground-l4"
            bind:value={searchQuery}
          />
          <IconSearch class="size-5 shrink-0 text-foreground-l3" />
        </div>
        <Tooltip.Root>
          <Tooltip.Trigger
            onclick={() => (hideSolved = !hideSolved)}
            aria-label={hideSolved ? 'Show solved challenges' : 'Hide solved challenges'}
            class={cn(
              'rounded-sm px-4 py-2',
              hideSolved
                ? 'bg-background-accent text-foreground-accent hover:opacity-80'
                : 'bg-background-l3 text-foreground-l3 hover:bg-background-l4 hover:text-foreground-l1'
            )}
          >
            {#if hideSolved}
              <IconEyeClosed class="size-5" />
            {:else}
              <IconEye class="size-5" />
            {/if}
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            {hideSolved ? 'Show solved' : 'Hide solved'}
          </Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger
            onclick={collapseAll}
            aria-label="Collapse all"
            class="rounded-l-sm bg-background-l3 px-4 py-2 text-foreground-l3 hover:bg-background-l4 hover:text-foreground-l1"
          >
            <IconFold class="size-5" />
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            Collapse all
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    </div>
  </div>

  <ScrollArea class="min-h-0 flex-1">
    <div class="px-2 py-2">
      <Accordion.Root type="multiple" bind:value={openCategories}>
        {#each groups as [category, entries] (category)}
          {@const categorySolved = entries.filter(c => solvedIds.has(c.id)).length}
          <Accordion.Item value={category} class="border-b-0">
            <Accordion.Trigger class="py-3 hover:no-underline">
              <div class="flex items-center gap-2">
                <span class="font-medium">{category}</span>
                <Badge variant="outline" class="text-xs">
                  {categorySolved}/{entries.length}
                </Badge>
              </div>
            </Accordion.Trigger>
            <Accordion.Content class="pb-2">
              <ul class="flex flex-col gap-1">
                {#each entries as challenge (challenge.id)}
                  {@const isSolved = solvedIds.has(challenge.id)}
                  {@const isSelected = selectedId === challenge.id}
                  <li>
                    <button
                      type="button"
                      onclick={() => onSelect(challenge)}
                      class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-background-l2 {isSelected
                        ? 'bg-background-l2 ring-1 ring-border'
                        : ''} {isSolved ? 'text-foreground-success' : ''}"
                    >
                      {#if isSolved}
                        <IconCheckFilled class="size-4 shrink-0" />
                      {:else}
                        <span class="size-4 shrink-0"></span>
                      {/if}
                      <span class="flex-1 truncate">{challenge.name}</span>
                      {#if challenge.points !== null}
                        <span class="text-foreground-l3 text-xs tabular-nums">
                          {challenge.points}
                        </span>
                      {/if}
                    </button>
                  </li>
                {/each}
              </ul>
            </Accordion.Content>
          </Accordion.Item>
        {/each}
      </Accordion.Root>
    </div>
  </ScrollArea>
</div>

