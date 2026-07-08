<script lang="ts">
  import { page } from '$app/state'
  import type { Component } from 'svelte'

  type Props = {
    href?: string
    activePath?: string
    label: string
    icon: Component
    [key: string]: unknown
  }

  let { href, activePath, label, icon: Icon, ...rest }: Props = $props()

  const active = $derived.by(() => {
    if (!activePath) return false
    if (activePath === '/') return page.url.pathname === '/'
    return page.url.pathname.startsWith(activePath)
  })
</script>

{#if href}
  <a
    {href}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    data-active={active ? '' : undefined}
    {...rest}
  >
    <Icon />
  </a>
{:else}
  <button type="button" aria-label={label} data-active={active ? '' : undefined} {...rest}>
    <Icon />
  </button>
{/if}

<style>
  a,
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    font-size: 1.5rem;
    color: var(--foreground-l2);
    background: var(--background-l2);
    border-radius: var(--radius-lg);
    cursor: pointer;

    &:hover {
      background: var(--background-l3);
    }

    &[data-active] {
      color: var(--foreground-accent);
      background: var(--background-accent);

      &:hover {
        background: var(--background-accent-hover);
      }
    }

    :global(svg) {
      flex-shrink: 0;
    }
  }
</style>
