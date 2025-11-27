<script lang="ts">
  import type { Challenge } from '$lib/api'
  import { getCategoryConfig, getCategoryStyle } from '$lib/categories'

  type Props = {
    challenge: Challenge
    isSolved: boolean
  }

  let { challenge }: Props = $props()

  const tags = $derived([
    challenge.category,
    ...((challenge as Challenge & { tags?: string[] }).tags ?? []),
  ])
</script>

<div class="flex flex-col gap-4 py-6">
  <div class="px-9 flex items-start justify-between gap-4">
    <div class="flex flex-col">
      <h2 class="text-2xl">{challenge.name}</h2>
      <p class="text-foreground-l3 text-base">by {challenge.author}</p>
    </div>
    <div class="flex flex-col items-end">
      <h2 class="text-right text-2xl tabular-nums">
        {challenge.points?.toLocaleString() ?? '0'} pts
      </h2>
      <p class="text-right text-foreground-l3 text-base tabular-nums">
        {challenge.solves?.toLocaleString() ?? '0'} solves
      </p>
    </div>
  </div>

  <div class="px-5 flex flex-wrap gap-2">
    {#each tags as tag, i}
      {@const isCategory = i === 0}
      {@const config = getCategoryConfig(isCategory ? tag : challenge.category)}
      {@const style = getCategoryStyle(config.color)}
      <span
        class="inline-flex items-center gap-1.5 rounded-md px-4 py-1 text-sm bg-category-background-l0 text-category-foreground-l1"
        {style}
      >
        {#if isCategory}
          {@const Icon = config.icon}
          <Icon class="size-4" />
        {/if}
        {isCategory ? config.name : tag}
      </span>
    {/each}
  </div>
</div>
