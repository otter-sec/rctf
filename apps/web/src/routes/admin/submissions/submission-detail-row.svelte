<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconX } from '$lib/icons'
  import { cn } from '$lib/utils'
  import type { VirtualRow } from './submissions-filter-ui'
  import { detailEntries, type DetailEntry, type Submission } from './submissions-utils'

  interface Props {
    row: VirtualRow
    submission: Submission
    listScrollMargin: number
    onClose: () => void
  }

  let { row, submission, listScrollMargin, onClose }: Props = $props()
  const entries = $derived(detailEntries(submission))
</script>

{#snippet detailPill(entry: DetailEntry)}
  <Tooltip.Root>
    <Tooltip.Trigger>
      <span
        class={cn(
          'bg-background-l4 inline-flex min-w-0 shrink-0 items-center gap-1 rounded-md px-2 py-1 whitespace-nowrap',
          entry.label === 'error' ? 'max-w-[36rem]' : 'max-w-[28rem]'
        )}
      >
        <span class="text-foreground-l3 shrink-0 text-xs">{entry.label}</span>
        <code class="text-foreground-l1 min-w-0 truncate text-xs">{entry.value}</code>
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content class="max-w-md break-all">{entry.label}: {entry.value}</Tooltip.Content>
  </Tooltip.Root>
{/snippet}

<div
  class="absolute top-0 left-0 w-full will-change-transform contain-[layout_style_paint]"
  style:height={`${row.size}px`}
  style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
>
  <div class="bg-background-l3 flex h-full min-w-0 items-center gap-2 overflow-hidden px-3 pl-12">
    <span class="text-foreground-l3 shrink-0 text-sm whitespace-nowrap">Submitted</span>
    <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 whitespace-nowrap">
      {#each entries as entry (`${submission.id}:${entry.label}:${entry.value}`)}
        {@render detailPill(entry)}
      {/each}
    </div>
    <button
      type="button"
      aria-label="Close submitted details"
      class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
      onclick={onClose}
    >
      <IconX class="size-4" />
    </button>
  </div>
</div>
