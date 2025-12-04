<script lang="ts">
  import type { Challenge } from '$lib/api'
  import { IconAwardFilled, IconCheck } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    challenge: Challenge
    category: string
    isSolved: boolean
    isFirstBlood: boolean
    isSelected: boolean
    onSelect: () => void
  }

  let { challenge, category, isSolved, isFirstBlood, isSelected, onSelect }: Props = $props()
</script>

<li>
  <button
    type="button"
    onclick={onSelect}
    class={cn(
      'relative flex w-full flex-col @sm:flex-row @sm:items-center @sm:justify-between px-9 py-3 text-left hover:bg-category-background-l1-hover gap-1',
      isSolved &&
        !isFirstBlood &&
        'before:absolute before:inset-y-0 before:left-0 before:w-36 before:bg-linear-to-r before:from-background-success/50 dark:before:from-foreground-success/20 before:to-transparent',
      isFirstBlood &&
        'before:absolute before:inset-y-0 before:left-0 before:w-36 before:bg-linear-to-r before:from-background-gold/50 dark:before:from-foreground-gold-l0/20 before:to-transparent',
      isSelected &&
        'ring-2 ring-inset ring-category-foreground-l1/25 after:absolute after:inset-y-0 after:right-0 after:w-96 after:bg-linear-to-l after:from-category-background-l0 after:to-transparent'
    )}>
    {#if isFirstBlood}
      <IconAwardFilled
        class="absolute left-2 top-1/2 -translate-y-1/2 size-5 text-foreground-gold-l0" />
    {:else if isSolved}
      <IconCheck class="absolute left-2 top-1/2 -translate-y-1/2 size-5 text-foreground-success" />
    {/if}
    <div class="flex min-w-0 flex-1 flex-col z-1">
      <div class="truncate text-xl">
        <span class="hidden @sm:inline text-category-foreground-l1">{category} /</span>
        <span class="text-category-foreground-l0">{challenge.name}</span>
      </div>
      <span class="truncate text-base text-category-foreground-l1 opacity-75">
        {challenge.author}
      </span>
    </div>
    <div
      class="flex shrink-0 flex-row @sm:flex-col items-baseline @sm:items-end gap-2 @sm:gap-0 z-1">
      {#if challenge.points !== null}
        <div class="text-xl tabular-nums whitespace-nowrap">
          <span class="text-category-foreground-l0">{challenge.points}</span>
          <span class="text-category-foreground-l1">pts</span>
        </div>
      {/if}
      {#if challenge.solves !== null}
        <span
          class="text-base tabular-nums text-category-foreground-l1 opacity-75 whitespace-nowrap">
          {challenge.solves}
          {challenge.solves === 1 ? 'solve' : 'solves'}
        </span>
      {/if}
    </div>
  </button>
</li>
