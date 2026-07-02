<script lang="ts">
  import { page } from '$app/state'
  import IconAlertTriangleFilled from '$lib/icons/icon-alert-triangle-filled.svelte'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
</script>

<error-page>
  <Card
    title={page.status === 404 ? 'Page not found' : 'Something went wrong'}
    description={page.status === 404
      ? "The page you're looking for doesn't exist."
      : 'An error occurred while loading this page.'}
  >
    <error-details>
      <IconAlertTriangleFilled />
      {#if page.error?.message}
        <p role="alert">{page.error.message}</p>
      {/if}
      <p>Error code: {page.status}</p>
      <Button href="/">Go to home</Button>
    </error-details>
  </Card>
</error-page>

<style>
  error-page {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-s);

    :global(ui-card) {
      inline-size: 100%;
      max-inline-size: 28rem;
    }
  }

  error-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);

    :global(svg) {
      font-size: var(--step-2);
      color: var(--foreground-destructive);
    }

    p[role='alert'] {
      padding: var(--space-2xs);
      color: var(--foreground-destructive);
      background: var(--background-destructive);
      border-radius: var(--radius-md);
    }

    p:not([role]) {
      font-size: var(--step--1);
      color: var(--foreground-l3);
    }
  }
</style>
