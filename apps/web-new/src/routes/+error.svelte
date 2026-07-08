<script lang="ts">
  import { page } from '$app/state'
  import { IconAlertTriangleFilled } from '$lib/icons'
  import Button from '$lib/ui/button.svelte'
  import StatusCard from '$lib/ui/status-card.svelte'

  const detail = $derived(
    page.error?.message ? `${page.error.message} · ${page.status}` : `Error ${page.status}`
  )
</script>

<error-page>
  <StatusCard
    icon={IconAlertTriangleFilled}
    tone="danger"
    title={page.status === 404 ? 'Page not found' : 'Something went wrong'}
    subtitle={page.status === 404
      ? "The page you're looking for doesn't exist."
      : 'An error occurred while loading this page.'}
    {detail}
  >
    <Button href="/">Go to home</Button>
  </StatusCard>
</error-page>

<style>
  error-page {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-s);
  }
</style>
