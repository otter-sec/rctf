<script lang="ts">
  import IconSearch from '$lib/icons/icon-search.svelte'

  type Props = {
    value: string
    placeholder: string
    onInput: (value: string) => void
    variant?: 'menu' | 'mobile'
  }

  let { value, placeholder, onInput, variant = 'menu' }: Props = $props()
</script>

<filter-search data-variant={variant}>
  <IconSearch aria-hidden="true" />
  <input type="text" {placeholder} {value} oninput={event => onInput(event.currentTarget.value)} />
</filter-search>

<style>
  filter-search {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-2xs);
    block-size: 2.75rem;
    padding-inline: 0.75rem;
    color: var(--foreground-l3);
    border-block-end: 2px solid var(--border);

    :global(svg) {
      flex-shrink: 0;
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }
  }

  filter-search[data-variant='mobile'] {
    block-size: 2.5rem;
    background: var(--background-l2);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
  }

  input {
    min-inline-size: 0;
    flex: 1;
    color: var(--foreground-l1);
    background: transparent;
    border: none;
    font-size: var(--step--1);

    &::placeholder {
      color: var(--foreground-l4);
    }

    &:focus-visible {
      outline: none;
    }
  }
</style>
