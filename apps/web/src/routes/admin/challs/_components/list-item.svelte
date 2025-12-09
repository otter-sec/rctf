<script lang="ts">
  import type { AdminChallenge } from '@rctf/types'
  import { cn } from '$lib/utils'

  interface Props {
    challenge: AdminChallenge
    category: string
    isSelected: boolean
    onSelect: () => void
  }

  let { challenge, category, isSelected, onSelect }: Props = $props()

  const { name, author, points, files } = $derived(challenge)
</script>

<li>
  <button
    type="button"
    onclick={onSelect}
    class={cn(
      'relative flex w-full flex-col gap-1 px-9 py-3 text-left hover:bg-category-background-l1-hover @sm:flex-row @sm:items-center @sm:justify-between',
      isSelected &&
        'ring-2 ring-inset ring-category-foreground-l1/25 after:absolute after:inset-y-0 after:right-0 after:w-96 after:bg-linear-to-l after:from-category-background-l0 after:to-transparent'
    )}>
    <div class="z-1 flex min-w-0 flex-1 flex-col">
      <div class="truncate text-xl">
        <span class="hidden text-category-foreground-l1 @sm:inline">{category} /</span>
        <span class="text-category-foreground-l0">{name}</span>
      </div>
      <span class="truncate text-base text-category-foreground-l1 opacity-75">{author}</span>
    </div>
    <div
      class="z-1 flex shrink-0 flex-row items-baseline gap-2 @sm:flex-col @sm:items-end @sm:gap-0">
      <div class="whitespace-nowrap text-xl tabular-nums">
        <span class="text-category-foreground-l0">{points.min}–{points.max}</span>
        <span class="text-category-foreground-l1">pts</span>
      </div>
      <span class="whitespace-nowrap text-base tabular-nums text-category-foreground-l1 opacity-75">
        {files.length} file{files.length === 1 ? '' : 's'}
      </span>
    </div>
  </button>
</li>
