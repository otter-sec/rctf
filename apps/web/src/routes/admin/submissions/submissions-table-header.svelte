<script lang="ts">
  import { SubmissionSortBy, SubmissionSortOrder } from '@rctf/types'
  import { IconChevronDown, IconChevronUp, IconSelector } from '$lib/icons'
  import type { SortBy, SortOrder } from './submissions-utils'

  interface Props {
    sortBy: SortBy
    sortOrder: SortOrder
    onSort: (sortBy: SortBy) => void
  }

  let { sortBy, sortOrder, onSort }: Props = $props()
</script>

{#snippet sortIndicator(column: SortBy)}
  {#if sortBy === column}
    {#if sortOrder === SubmissionSortOrder.ASC}
      <IconChevronUp class="size-4" />
    {:else}
      <IconChevronDown class="size-4" />
    {/if}
  {:else}
    <IconSelector class="text-foreground-l4 size-4" />
  {/if}
{/snippet}

{#snippet sortHeader(column: SortBy, label: string)}
  <button
    type="button"
    class="hover:text-foreground-l0 flex w-full items-center gap-1 px-3 py-2 text-left whitespace-nowrap"
    onclick={() => onSort(column)}
  >
    <span class="truncate">{label}</span>
    {@render sortIndicator(column)}
  </button>
{/snippet}

<div
  class="bg-background-l3 text-foreground-l3 relative z-10 grid grid-cols-[2.75rem_16rem_20rem_minmax(16rem,1fr)_11rem_9rem_10rem] border-b-2 text-base"
>
  <div></div>
  <div class="font-normal">
    {@render sortHeader(SubmissionSortBy.CREATED_AT, 'Time')}
  </div>
  <div class="font-normal">
    {@render sortHeader(SubmissionSortBy.CHALLENGE, 'Challenge')}
  </div>
  <div class="font-normal">
    {@render sortHeader(SubmissionSortBy.TEAM, 'Team')}
  </div>
  <div class="font-normal">
    {@render sortHeader(SubmissionSortBy.IP, 'IP')}
  </div>
  <div class="font-normal">
    {@render sortHeader(SubmissionSortBy.KIND, 'Kind')}
  </div>
  <div class="font-normal">
    {@render sortHeader(SubmissionSortBy.RESULT, 'Result')}
  </div>
</div>
