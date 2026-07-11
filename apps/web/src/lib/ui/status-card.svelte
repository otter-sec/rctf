<script lang="ts">
  import type { Component, Snippet } from 'svelte'

  type Props = {
    icon?: Component
    tone?: 'neutral' | 'danger'
    title: string
    subtitle?: string
    detail?: string
    children?: Snippet
  }

  let { icon: Icon, tone = 'neutral', title, subtitle, detail, children }: Props = $props()
</script>

<status-card data-tone={tone}>
  {#if Icon}
    <status-icon aria-hidden="true"><Icon /></status-icon>
  {/if}
  <status-title>{title}</status-title>
  {#if subtitle}
    <status-subtitle>{subtitle}</status-subtitle>
  {/if}
  {#if detail}
    <status-detail role="alert">{detail}</status-detail>
  {/if}
  {#if children}
    <status-actions>{@render children()}</status-actions>
  {/if}
</status-card>

<style>
  status-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    inline-size: 100%;
    max-inline-size: 24rem;
    padding: var(--space-m);
    background: var(--background-l1);
    border-radius: var(--radius-lg);
  }

  status-icon {
    display: flex;
    margin-block-end: var(--space-3xs);
    font-size: 2.5rem;
    color: var(--foreground-l4);

    status-card[data-tone='danger'] & {
      color: var(--foreground-destructive);
    }
  }

  status-title {
    font-size: var(--step-1);
    color: var(--foreground-l0);
  }

  status-subtitle {
    color: var(--foreground-l3);
  }

  status-detail {
    font-size: var(--step--1);
    color: var(--foreground-l4);
  }

  status-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    margin-block-start: var(--space-2xs);

    :global(a),
    :global(button) {
      inline-size: 100%;
    }
  }
</style>
