<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { IconAwardFilled, IconCheck } from '$lib/icons'
  import { cn, getBloodStyles, type BloodIndex } from '$lib/utils'

  interface Props {
    challenge: Challenge
    category: string
    isSolved: boolean
    bloodIndex: BloodIndex | null
    isSelected: boolean
    onSelect: () => void
  }

  let { challenge, category, isSolved, bloodIndex, isSelected, onSelect }: Props = $props()

  const isBlood = $derived(bloodIndex !== null)
  const bloodStyles = $derived(bloodIndex !== null ? getBloodStyles(bloodIndex) : null)
</script>

<li id="chall-{challenge.id}">
  <button
    type="button"
    onclick={onSelect}
    class={cn(
      'hover:bg-category-background-l1-hover relative flex w-full cursor-pointer flex-col gap-1 px-9 py-3 text-left @sm/list:flex-row @sm/list:items-center @sm/list:justify-between',
      isSolved &&
        !isBlood &&
        'before:from-foreground-success/20 before:absolute before:inset-y-0 before:left-0 before:w-36 before:bg-linear-to-r before:to-transparent',
      isBlood &&
        bloodStyles && [
          'before:absolute before:inset-y-0 before:left-0 before:w-36 before:bg-linear-to-r before:to-transparent',
          bloodStyles.gradient,
        ],
      isSelected &&
        'ring-category-foreground-l1/25 after:from-category-background-l0 ring-2 ring-inset after:absolute after:inset-y-0 after:right-0 after:w-96 after:bg-linear-to-l after:to-transparent'
    )}
  >
    {#if isBlood}
      <IconAwardFilled
        class={cn('absolute top-1/2 left-2 size-5 -translate-y-1/2', bloodStyles?.iconColor)}
      />
    {:else if isSolved}
      <IconCheck class="text-foreground-success absolute top-1/2 left-2 size-5 -translate-y-1/2" />
    {/if}
    <div class="z-1 flex min-w-0 flex-1 flex-col">
      <div class="truncate text-xl">
        <span class="text-category-foreground-l1 hidden @sm/list:inline">{category} /</span>
        <span class="text-category-foreground-l0">{challenge.name}</span>
      </div>
      <span class="text-category-foreground-l1 truncate text-base opacity-75">
        {challenge.author}
      </span>
    </div>
    {#if challenge.hasFlag}
      <div
        class="z-1 flex shrink-0 flex-row items-baseline gap-2 @sm/list:flex-col @sm/list:items-end @sm/list:gap-0"
      >
        {#if challenge.points !== null}
          <div class="text-xl whitespace-nowrap tabular-nums">
            <span class="text-category-foreground-l0">{challenge.points}</span>
            <span class="text-category-foreground-l1">pts</span>
          </div>
        {/if}
        {#if challenge.solves !== null}
          <span
            class="text-category-foreground-l1 text-base whitespace-nowrap tabular-nums opacity-75"
          >
            {challenge.solves}
            {challenge.solves === 1 ? 'solve' : 'solves'}
          </span>
        {/if}
      </div>
    {/if}
  </button>
</li>
