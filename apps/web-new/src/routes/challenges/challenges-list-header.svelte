<!--
  Challenge-list toolbar: earned/total stats, a plain (undebounced) controlled
  search box, a persisted hide-solved toggle, and a collapse/expand-all toggle.
  All state lives in the parent list; this component is pure presentation +
  callbacks.
-->
<script lang="ts">
  import { mergeProps } from '@zag-js/svelte'
  import IconEyeClosed from '$lib/icons/icon-eye-closed.svelte'
  import IconEyeFilled from '$lib/icons/icon-eye-filled.svelte'
  import IconFold from '$lib/icons/icon-fold.svelte'
  import IconSearch from '$lib/icons/icon-search.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'

  interface Props {
    pointsEarned: number
    pointsTotal: number
    solvedCount: number
    totalCount: number
    searchQuery: string
    hideSolved: boolean
    anyOpen: boolean
    onSearchChange: (value: string) => void
    onToggleHideSolved: () => void
    onToggleCollapse: () => void
  }

  let {
    pointsEarned,
    pointsTotal,
    solvedCount,
    totalCount,
    searchQuery,
    hideSolved,
    anyOpen,
    onSearchChange,
    onToggleHideSolved,
    onToggleCollapse,
  }: Props = $props()
</script>

<challenges-list-header>
  <list-stats>
    <span data-part="points">
      <strong>{pointsEarned.toLocaleString()}</strong>
      / {pointsTotal.toLocaleString()} pts
    </span>
    <span data-part="solved">
      <strong>{solvedCount.toLocaleString()}</strong>
      / {totalCount.toLocaleString()}
    </span>
  </list-stats>

  <list-controls>
    <search-box>
      <IconSearch />
      <input
        type="search"
        value={searchQuery}
        oninput={event => onSearchChange(event.currentTarget.value)}
        placeholder="Search challenges..."
        aria-label="Search challenges"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </search-box>

    <toggle-group>
      <Tooltip label={hideSolved ? 'Show solved' : 'Hide solved'}>
        {#snippet children({ props })}
          <button
            {...mergeProps(props, { onclick: onToggleHideSolved })}
            type="button"
            data-slot="hide-solved"
            data-active={hideSolved || undefined}
            aria-pressed={hideSolved}
            aria-label={hideSolved ? 'Show solved challenges' : 'Hide solved challenges'}
          >
            {#if hideSolved}
              <IconEyeClosed />
            {:else}
              <IconEyeFilled />
            {/if}
          </button>
        {/snippet}
      </Tooltip>

      <Tooltip label={anyOpen ? 'Collapse all' : 'Expand all'}>
        {#snippet children({ props })}
          <button
            {...mergeProps(props, { onclick: onToggleCollapse })}
            type="button"
            data-slot="collapse"
            data-active={!anyOpen || undefined}
            aria-label={anyOpen ? 'Collapse all categories' : 'Expand all categories'}
          >
            <IconFold />
          </button>
        {/snippet}
      </Tooltip>
    </toggle-group>
  </list-controls>
</challenges-list-header>

<style>
  /* 2.25rem stats rail / 1.25rem controls rail mirror the detail pane's
     alignment paddings. */
  challenges-list-header {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    gap: 0.5rem;
    padding-block: 0.5rem;
  }

  list-stats {
    display: flex;
    justify-content: space-between;
    padding-inline: 2.25rem;
    color: var(--foreground-l5);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;

    strong {
      color: var(--foreground-l3);
      font-weight: var(--font-weight-normal);
    }
  }

  list-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding-inline: 1.25rem;
  }

  toggle-group {
    display: flex;
    gap: 0.25rem;
    inline-size: 100%;

    @container challenges-list (width >= 24rem) {
      inline-size: auto;
    }
  }

  search-box {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-2xs);
    min-inline-size: 0;
    block-size: 2.5rem;
    padding-inline: 0.75rem;
    color: var(--foreground-l3);
    background: var(--background-l4);
    border-radius: 20px;

    @container challenges-list (width >= 24rem) {
      border-radius: 20px var(--radius-sm) var(--radius-sm) 20px;
    }

    &:focus-within {
      outline: 2px solid var(--ring);
      outline-offset: 1px;
    }

    :global(svg) {
      flex-shrink: 0;
      color: var(--foreground-l3);
    }
  }

  input {
    inline-size: 100%;
    min-inline-size: 0;
    background: transparent;
    border: none;
    color: var(--foreground-l0);
    outline: none;

    &::placeholder {
      color: var(--foreground-l4);
    }
  }

  button {
    display: inline-flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    block-size: 2.5rem;
    padding-inline: 1rem;
    color: var(--foreground-l1);
    background: var(--background-l4);
    cursor: pointer;

    @container challenges-list (width >= 24rem) {
      flex: initial;
    }

    &[data-slot='hide-solved'] {
      border-radius: 20px var(--radius-sm) var(--radius-sm) 20px;

      @container challenges-list (width >= 24rem) {
        border-radius: var(--radius-sm);
      }
    }

    &[data-slot='collapse'] {
      border-radius: var(--radius-sm) 20px 20px var(--radius-sm);
    }

    :global(svg) {
      font-size: 1.25rem;
    }

    &:hover {
      background: var(--background-l5);
    }

    &[data-active] {
      color: var(--foreground-accent);
      background: var(--background-accent);

      &:hover {
        background: var(--background-accent-hover);
      }
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }
</style>
