<script lang="ts">
  import type { Challenge } from '$lib/api'
  import { getCategoryConfig, getCategoryStyle } from '$lib/categories'

  type Props = {
    challenge: Challenge
    isSolved: boolean
  }

  let { challenge }: Props = $props()

  const config = $derived(getCategoryConfig(challenge.category))
  const categoryStyle = $derived(getCategoryStyle(config.color))
  const otherTags = $derived(
    (challenge as Challenge & { tags?: string[] }).tags ?? []
  )
</script>

<div class="flex flex-col py-6">
  <div class="px-9 flex items-start justify-between gap-4">
    <div class="flex flex-col gap-1">
      <h2 class="text-2xl">{challenge.name}</h2>
      <div class="flex items-center gap-2 text-foreground-l3 text-base">
        <span>by {challenge.author}</span>
        <span class="text-foreground-l5 opacity-50 text-2xl leading-none"
          >·</span
        >
        <div class="flex gap-1">
          <span
            class="inline-flex items-center gap-1 rounded-lg bg-category-background-l0 text-category-foreground-l1 px-3 py-0.5 text-sm"
            style={categoryStyle}
          >
            <config.icon class="size-3.5" />
            {config.name}
          </span>
          {#each otherTags as tag}
            <span class="rounded bg-background-l2 px-1.5 py-0.5 text-sm"
              >{tag}</span
            >
          {/each}
        </div>
      </div>
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
</div>
