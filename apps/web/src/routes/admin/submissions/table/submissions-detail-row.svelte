<script lang="ts">
  import { IconX } from '$lib/icons'
  import { detailEntries, type Submission } from '../submissions-model'

  type Props = {
    submission: Submission
    onClose: () => void
  }

  let { submission, onClose }: Props = $props()

  const entries = $derived(detailEntries(submission))
</script>

<detail-row>
  <detail-label>Submitted</detail-label>
  <detail-pills>
    {#if entries.length === 0}
      <detail-empty>No details recorded</detail-empty>
    {:else}
      {#each entries as entry (`${entry.label}:${entry.value}`)}
        <detail-pill
          data-wide={entry.wide || undefined}
          title={`${entry.label}: ${entry.value}`}
        >
          <pill-label>{entry.label}</pill-label>
          <code>{entry.value}</code>
        </detail-pill>
      {/each}
    {/if}
  </detail-pills>
  <button type="button" aria-label="Close submitted details" onclick={onClose}>
    <IconX aria-hidden="true" />
  </button>
</detail-row>

<style>
  detail-row {
    display: flex;
    inline-size: 100%;
    block-size: 3rem;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-2xs);
    padding-inline: var(--space-2xs) var(--space-2xs);
    padding-inline-start: 3.25rem;
    background: var(--background-l3);
  }

  detail-label {
    flex-shrink: 0;
    color: var(--foreground-l3);
    font-size: var(--step--1);
    white-space: nowrap;
  }

  detail-pills {
    display: flex;
    min-inline-size: 0;
    flex: 1;
    gap: var(--space-3xs);
    overflow-x: auto;
    overscroll-behavior: none;
    padding-block-end: 2px;
    white-space: nowrap;
  }

  detail-pill {
    display: inline-flex;
    min-inline-size: 0;
    max-inline-size: 28rem;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-3xs);
    padding: var(--space-3xs) var(--space-2xs);
    background: var(--background-l4);
    border-radius: var(--radius-md);
    white-space: nowrap;

    &[data-wide] {
      max-inline-size: 40rem;
    }
  }

  pill-label {
    flex-shrink: 0;
    color: var(--foreground-l3);
    font-size: var(--step--2);
  }

  code {
    min-inline-size: 0;
    overflow: hidden;
    color: var(--foreground-l1);
    font-size: var(--step--2);
    text-overflow: ellipsis;
  }

  detail-empty {
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }

  button {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    inline-size: 1.75rem;
    block-size: 1.75rem;
    color: var(--foreground-l3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;

    &:hover {
      color: var(--foreground-l1);
      background: var(--background-l4);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
    }

    :global(svg) {
      inline-size: 1rem;
      block-size: 1rem;
    }
  }
</style>
