<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { getCategoryConfig, getCategoryStyle } from '$lib/utils'

  interface Props {
    challenge: Challenge
    isSolved: boolean
  }

  let { challenge }: Props = $props()

  const config = $derived(getCategoryConfig(challenge.category))
  const categoryStyle = $derived(getCategoryStyle(config.color))
  const otherTags = $derived((challenge as Challenge & { tags?: string[] }).tags ?? [])
</script>

<div class="flex flex-col py-4 sm:py-6">
  <div class="flex items-start justify-between gap-4 px-9">
    <div class="flex flex-1 flex-col gap-1">
      <h2 class="text-xl @xl/details:text-2xl">{challenge.name}</h2>
      <div
        class="text-foreground-l3 @xl/details:flex-text-base flex flex-wrap items-center gap-2 text-base"
      >
        <span>by {challenge.author}</span>
        <span class="text-foreground-l5 text-2xl leading-none opacity-50">·</span>
        <div class="flex gap-1">
          <span
            class="bg-category-background-l0 text-category-foreground-l1 inline-flex items-center gap-1 rounded-lg px-3 py-0.5 text-sm"
            style={categoryStyle}
          >
            <config.icon class="size-3.5 shrink-0" />
            {config.name}
          </span>
          {#each otherTags as tag}
            <span class="bg-background-l2 rounded px-1.5 py-0.5 text-sm">{tag}</span>
          {/each}
        </div>
      </div>
    </div>
    <div class="flex flex-col items-end">
      <h2 class="text-right text-xl whitespace-nowrap tabular-nums @xl/details:text-2xl">
        {challenge.points?.toLocaleString() ?? '0'} pts
      </h2>
      <p class="text-foreground-l3 text-right text-base whitespace-nowrap tabular-nums">
        {challenge.solves?.toLocaleString() ?? '0'} solves
      </p>
    </div>
  </div>
</div>
