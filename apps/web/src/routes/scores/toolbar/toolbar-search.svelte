<script lang="ts">
  import { captureElement } from '$lib/attachments/capture-element'
  import { IconSearch, IconX } from '$lib/icons'
  import Spinner from '$lib/ui/spinner.svelte'

  interface Props {
    value: string
    pending: boolean
    oninput: (value: string) => void
    onclear: () => void
  }

  let { value, pending, oninput, onclear }: Props = $props()

  let inputEl = $state<HTMLInputElement | null>(null)
  const captureInput = captureElement<HTMLInputElement>(
    node => (inputEl = node)
  )

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.altKey || !(event.ctrlKey || event.metaKey)) return
    if (event.key.toLowerCase() !== 'f') return
    event.preventDefault()
    inputEl?.focus()
    inputEl?.select()
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<label data-search-box>
  {#if pending}
    <Spinner label="Searching teams" />
  {:else}
    <IconSearch />
  {/if}
  <input
    {@attach captureInput}
    type="text"
    aria-label="Search teams"
    placeholder="Search teams..."
    {value}
    oninput={event => oninput(event.currentTarget.value)}
  />
  <button
    type="button"
    aria-label="Clear team search"
    data-empty={!value || undefined}
    tabindex={value ? undefined : -1}
    onclick={onclear}
  >
    <IconX />
  </button>
</label>

<style>
  label[data-search-box] {
    display: flex;
    align-items: center;
    inline-size: 100%;
    gap: var(--space-2xs);
    block-size: 2.25rem;
    padding-inline: var(--space-s);
    color: var(--foreground-l1);
    background: var(--background-l4);
    border-radius: var(--radius-md);
    cursor: text;

    &:focus-within {
      outline: 2px solid var(--ring);
    }

    > :global(svg),
    :global([role='status']) {
      flex-shrink: 0;
      font-size: 1.125rem;
      color: var(--foreground-l1);
    }
  }

  input {
    inline-size: 100%;
    min-inline-size: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--foreground-l0);
    text-overflow: ellipsis;

    &::placeholder {
      color: var(--foreground-l1);
      text-overflow: ellipsis;
    }
  }

  button {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0;
    color: var(--foreground-l1);
    background: transparent;
    cursor: pointer;
    transition:
      color 150ms ease,
      opacity 150ms ease;

    :global(svg) {
      font-size: 1rem;
    }

    &:hover {
      color: var(--foreground-l0);
    }

    &[data-empty] {
      pointer-events: none;
      opacity: 0;
    }
  }
</style>
