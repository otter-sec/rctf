<script lang="ts">
  import { SubmissionSortBy } from '@rctf/types'
  import { IconChevronDown } from '$lib/icons'
  import type { SubmissionSort } from '../submissions-model'

  type Props = {
    sort: SubmissionSort
    onSort: (column: SubmissionSortBy) => void
  }

  let { sort, onSort }: Props = $props()

  const columns: { column: SubmissionSortBy; label: string }[] = [
    { column: SubmissionSortBy.CREATED_AT, label: 'Time' },
    { column: SubmissionSortBy.CHALLENGE, label: 'Challenge' },
    { column: SubmissionSortBy.TEAM, label: 'Team' },
    { column: SubmissionSortBy.IP, label: 'IP' },
    { column: SubmissionSortBy.KIND, label: 'Kind' },
    { column: SubmissionSortBy.RESULT, label: 'Result' },
  ]
</script>

<submission-header>
  <header-cell data-col="expander"></header-cell>
  {#each columns as { column, label } (column)}
    <header-cell>
      <button
        type="button"
        data-active={sort.by === column || undefined}
        data-order={sort.by === column ? sort.order : undefined}
        onclick={() => onSort(column)}
      >
        <span>{label}</span>
        <IconChevronDown aria-hidden="true" />
      </button>
    </header-cell>
  {/each}
</submission-header>

<style>
  submission-header {
    display: grid;
    grid-template-columns: 2.75rem 16rem 14rem minmax(11rem, 1fr) 11rem 9rem 10rem;
    inline-size: 100%;
    block-size: 100%;
    user-select: none;
    background: var(--background-l3);
    border-block-end: 2px solid var(--border);
    color: var(--foreground-l3);
    font-size: var(--step--1);
  }

  header-cell {
    display: flex;
    min-inline-size: 0;
    align-items: center;
  }

  button {
    display: flex;
    inline-size: 100%;
    align-items: center;
    gap: var(--space-3xs);
    padding: var(--space-2xs);
    color: inherit;
    background: transparent;
    border: none;
    text-align: start;
    white-space: nowrap;
    cursor: pointer;

    span {
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &:hover {
      color: var(--foreground-l1);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
    }

    :global(svg) {
      flex-shrink: 0;
      inline-size: 0.875rem;
      block-size: 0.875rem;
      opacity: 0;
      transition: rotate 0.15s ease;
    }

    &[data-active] {
      color: var(--foreground-l1);
    }

    &[data-active] :global(svg) {
      opacity: 1;
    }

    &[data-order='asc'] :global(svg) {
      rotate: 180deg;
    }
  }
</style>
