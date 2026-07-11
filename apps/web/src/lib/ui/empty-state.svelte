<script lang="ts">
  import type { Component } from 'svelte'

  type Props = {
    icon?: Component
    title: string
    subtitle?: string
  }

  let { icon: Icon, title, subtitle }: Props = $props()
</script>

<empty-state>
  {#if Icon}
    <Icon />
  {/if}
  <span data-part="title">{title}</span>
  {#if subtitle}
    <span data-part="subtitle">{subtitle}</span>
  {/if}
</empty-state>

<style>
  empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2xs);
    max-inline-size: 24rem;
    margin-inline: auto;
    padding-block: var(--space-2xl);
    text-align: center;

    :global(svg) {
      font-size: 2.5rem;
      color: var(--foreground-l4);
    }
  }

  [data-part='title'] {
    color: var(--foreground-l3);
  }

  [data-part='subtitle'] {
    font-size: var(--step--1);
    color: var(--foreground-l5);
  }
</style>
