<script lang="ts">
  import Icon from '@iconify/svelte'
  import type { Challenge } from '$lib/api'
  import { cn } from '$lib/utils'

  type Props = {
    challenge: Challenge
    category: string
    isSolved: boolean
    isSelected: boolean
    onSelect: () => void
  }

  let { challenge, category, isSolved, isSelected, onSelect }: Props = $props()
</script>

<li>
  <button
    type="button"
    onclick={onSelect}
    class={cn(
      'relative flex w-full items-center justify-between px-9 py-3 text-left hover:bg-category-background-l1-hover',
      isSolved &&
        'before:absolute before:inset-y-0 before:left-0 before:w-36 before:bg-linear-to-r before:from-foreground-success/20 before:to-transparent',
      isSelected &&
        'ring-2 ring-inset ring-category-foreground-l1/25 after:absolute after:inset-y-0 after:right-0 after:w-96 after:bg-linear-to-l after:from-category-background-l0 after:to-transparent'
    )}
  >
    {#if isSolved}
      <Icon
        icon="tabler:check"
        class="absolute left-2 top-1/2 -translate-y-1/2 size-5 text-foreground-success"
      />
    {/if}
    <div class="flex flex-col">
      <div class="text-xl">
        <span class="text-category-foreground-l1">{category} /</span>
        <span class="text-category-foreground-l0">{challenge.name}</span>
      </div>
      <span class="text-base text-category-foreground-l1 opacity-75">
        {challenge.author}
      </span>
    </div>
    <div class="flex flex-col items-end">
      {#if challenge.points !== null}
        <div class="text-xl tabular-nums">
          <span class="text-category-foreground-l0">{challenge.points}</span>
          <span class="text-category-foreground-l1">pts</span>
        </div>
      {/if}
      {#if challenge.solves !== null}
        <span
          class="text-base tabular-nums text-category-foreground-l1 opacity-75"
        >
          {challenge.solves} solves
        </span>
      {/if}
    </div>
  </button>
</li>
