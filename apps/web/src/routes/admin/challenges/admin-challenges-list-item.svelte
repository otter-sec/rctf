<script lang="ts">
  import type { AdminChallenge } from '@rctf/types'
  import { IconCloudComputingFilled } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    challenge: AdminChallenge
    category: string
    isSelected: boolean
    onSelect: () => void
  }

  let { challenge, category, isSelected, onSelect }: Props = $props()

  const { name, author, points, files, instancerConfig } = $derived(challenge)
</script>

<li>
  <button
    type="button"
    onclick={onSelect}
    class={cn(
      'hover:bg-category-background-l1-hover relative flex w-full cursor-pointer flex-col gap-1 px-9 py-3 text-left @sm/list:flex-row @sm/list:items-center @sm/list:justify-between',
      isSelected &&
        'ring-category-foreground-l1/25 after:from-category-background-l0 ring-2 ring-inset after:absolute after:inset-y-0 after:right-0 after:w-96 after:bg-linear-to-l after:to-transparent'
    )}
  >
    <div class="z-1 flex min-w-0 flex-1 flex-col">
      <div class="truncate text-xl">
        <span class="text-category-foreground-l1 hidden @sm/list:inline">{category} /</span>
        <span class="text-category-foreground-l0">{name}</span>
      </div>
      <span class="text-category-foreground-l1 truncate text-base opacity-75">{author}</span>
    </div>
    <div
      class="z-1 flex shrink-0 flex-row items-end gap-2 @sm/list:flex-col @sm/list:items-end @sm/list:gap-0"
    >
      <div class="text-xl whitespace-nowrap tabular-nums">
        <span class="text-category-foreground-l0">{points.min}–{points.max}</span>
        <span class="text-category-foreground-l1">pts</span>
      </div>
      <div
        class="text-category-foreground-l1 flex items-center gap-1.5 text-base whitespace-nowrap tabular-nums opacity-75"
      >
        {#if instancerConfig}
          <IconCloudComputingFilled class="size-4" />
          <span class="text-category-foreground-l1/50">·</span>
        {/if}
        <span>{files.length} file{files.length === 1 ? '' : 's'}</span>
      </div>
    </div>
  </button>
</li>
