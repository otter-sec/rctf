<script lang="ts">
  import { Spinner } from '$lib/components'
  import { IconSearch, IconX } from '$lib/icons'

  interface Props {
    search: string
    isSearching: boolean
    inputRef?: HTMLInputElement | null
    compact?: boolean
    onSearchChange: (value: string) => void
  }

  let {
    search,
    isSearching,
    inputRef = $bindable(null),
    compact = false,
    onSearchChange,
  }: Props = $props()

  function inputAttachment(input: HTMLInputElement) {
    inputRef = input
    return () => {
      if (inputRef === input) inputRef = null
    }
  }
</script>

<search-box compact={compact || undefined}>
  {#if isSearching}
    <Spinner class="status-icon" />
  {:else}
    <IconSearch class="status-icon" />
  {/if}
  <input
    {@attach inputAttachment}
    type="text"
    aria-label="Search teams"
    placeholder="Search teams..."
    value={search}
    oninput={e => onSearchChange(e.currentTarget.value)}
  />
  <button
    type="button"
    aria-label="Clear team search"
    data-empty={!search ? '' : undefined}
    tabindex={search ? 0 : -1}
    onclick={() => onSearchChange('')}
  >
    <IconX class="clear-icon" />
  </button>
</search-box>

<style>
  search-box {
    height: calc(var(--spacing) * 9);
    display: flex;
    align-items: center;
    gap: calc(var(--spacing) * 1.5);
    padding-inline: calc(var(--spacing) * 2.5);
    border-radius: var(--radius-md);
    background: var(--background-l2);

    &:focus-within {
      box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
    }

    :global(.status-icon) {
      width: calc(var(--spacing) * 4);
      height: calc(var(--spacing) * 4);
      flex-shrink: 0;
      color: var(--foreground-l3);
    }

    input {
      min-width: 0;
      flex: 1;
      border: 0;
      outline: none;
      background: transparent;
      color: var(--foreground-l1);
      font-size: var(--text-sm);

      &::placeholder {
        color: var(--foreground-l3);
      }
    }

    &[compact] input {
      width: calc(var(--spacing) * 28);

      @media (width >= 80rem) {
        width: calc(var(--spacing) * 44);
      }
    }

    button {
      width: calc(var(--spacing) * 4);
      height: calc(var(--spacing) * 4);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-inline-end: calc(var(--spacing) * -0.5);
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--foreground-l3);
      transition:
        color 150ms ease,
        opacity 150ms ease;

      &:hover,
      &:focus-visible {
        color: var(--foreground-l1);
      }

      &[data-empty] {
        pointer-events: none;
        opacity: 0;
      }
    }

    :global(.clear-icon) {
      width: 0.75rem;
      height: 0.75rem;
    }
  }
</style>
