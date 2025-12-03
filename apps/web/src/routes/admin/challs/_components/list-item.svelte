<script lang="ts">
  import type { AdminChallenge } from '$lib/api'
  import { cn } from '$lib/utils'

  interface Props {
    challenge: AdminChallenge
    category: string
    isSelected: boolean
    onSelect: () => void
  }

  let { challenge, category, isSelected, onSelect }: Props = $props()
</script>

<li>
  <button
    type="button"
    onclick={onSelect}
    class={cn(
      'relative flex w-full flex-col @sm:flex-row @sm:items-center @sm:justify-between px-9 py-3 text-left hover:bg-category-background-l1-hover gap-1',
      isSelected &&
        'ring-2 ring-inset ring-category-foreground-l1/25 after:absolute after:inset-y-0 after:right-0 after:w-96 after:bg-linear-to-l after:from-category-background-l0 after:to-transparent'
    )}
  >
    <div class="flex min-w-0 flex-1 flex-col z-1">
      <div class="truncate text-xl">
        <span class="hidden @sm:inline text-category-foreground-l1"
          >{category} /</span
        >
        <span class="text-category-foreground-l0">{challenge.name}</span>
      </div>
      <span class="truncate text-base text-category-foreground-l1 opacity-75">
        {challenge.author}
      </span>
    </div>
    <div
      class="flex shrink-0 flex-row @sm:flex-col items-baseline @sm:items-end gap-2 @sm:gap-0 z-1"
    >
      <div class="text-xl tabular-nums whitespace-nowrap">
        <span class="text-category-foreground-l0"
          >{challenge.points.min}–{challenge.points.max}</span
        >
        <span class="text-category-foreground-l1">pts</span>
      </div>
      <span
        class="text-base tabular-nums text-category-foreground-l1 opacity-75 whitespace-nowrap"
      >
        {challenge.files.length} file{challenge.files.length === 1 ? '' : 's'}
      </span>
    </div>
  </button>
</li>
