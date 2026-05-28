<script lang="ts">
  import { ChallengeScoringKind, type Challenge } from '@rctf/types'
  import { getCategoryConfig, getCategoryStyle } from '$lib/utils'
  import ChallengeDynamicDelta from './challenge-dynamic-delta.svelte'

  interface Props {
    challenge: Challenge
    isSolved: boolean
  }

  let { challenge }: Props = $props()

  const config = $derived(getCategoryConfig(challenge.category))
  const categoryStyle = $derived(getCategoryStyle(config.color))
  const otherTags = $derived((challenge as Challenge & { tags?: string[] }).tags ?? [])
  const isDynamic = $derived(challenge.scoringKind === ChallengeScoringKind.DYNAMIC)
  const displayPoints = $derived(isDynamic ? (challenge.yourScore ?? 0) : (challenge.points ?? 0))
  const displayPointDelta = $derived(challenge.yourPointDelta ?? 0)
  const showsScore = $derived(challenge.hasFlag || isDynamic)
</script>

<div class="flex flex-col px-9 py-4 sm:py-6">
  <div class="flex items-start justify-between gap-4">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <h2 class="truncate text-xl sm:text-2xl">{challenge.name}</h2>
      <div
        class="text-foreground-l3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:text-base"
      >
        <span class="shrink-0">by {challenge.author}</span>
        <span class="text-foreground-l5 hidden text-2xl leading-none opacity-50 sm:inline">·</span>
        <div class="flex flex-wrap gap-1">
          <span
            class="bg-category-background-l0 text-category-foreground-l1 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-xs sm:px-3 sm:text-sm"
            style={categoryStyle}
          >
            <config.icon class="size-3 shrink-0 sm:size-3.5" />
            {config.name}
          </span>
          {#each otherTags as tag (tag)}
            <span class="bg-background-l2 shrink-0 rounded px-1.5 py-0.5 text-xs sm:text-sm"
              >{tag}</span
            >
          {/each}
        </div>
      </div>
    </div>
    {#if showsScore}
      <div class="flex shrink-0 flex-col items-end">
        <h2 class="text-right text-xl whitespace-nowrap tabular-nums sm:text-2xl">
          {displayPoints.toLocaleString()} pts
        </h2>
        {#if isDynamic}
          <ChallengeDynamicDelta
            delta={displayPointDelta}
            class="justify-end text-sm sm:text-base"
          />
        {:else}
          <p
            class="text-foreground-l3 text-right text-sm whitespace-nowrap tabular-nums sm:text-base"
          >
            {challenge.solves?.toLocaleString() ?? '0'} solves
          </p>
        {/if}
      </div>
    {/if}
  </div>
</div>
