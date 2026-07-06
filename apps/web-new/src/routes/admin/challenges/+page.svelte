<!--
  Admin challenges route (R13, R14). Prefetched by +page.ts; this page shows a
  spinner while the list settles and an error card on failure, then hands off to
  the master-detail shell. Access is already gated by the admin +layout.
-->
<script lang="ts">
  import { useAdminChallenges } from '$lib/query/admin'
  import { useClientConfig } from '$lib/query/config'
  import Card from '$lib/ui/card.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import AdminChallenges from './admin-challenges.svelte'

  const configQuery = useClientConfig()
  const ctfName = $derived(configQuery.data?.ctfName)

  const challengesQuery = useAdminChallenges()
  const challenges = $derived(challengesQuery.data)
  const isPending = $derived(challengesQuery.isPending)
  const error = $derived(challengesQuery.error)
</script>

<svelte:head>
  {#if ctfName}
    <title>Challenges | {ctfName}</title>
  {/if}
</svelte:head>

{#if challenges}
  <AdminChallenges />
{:else if isPending}
  <page-status>
    <Spinner />
  </page-status>
{:else if error}
  <page-status>
    <Card title="Challenges">
      <p>{error.message}</p>
    </Card>
  </page-status>
{/if}

<style>
  page-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-l);

    :global(ui-card) {
      inline-size: 100%;
      max-inline-size: 28rem;
    }

    p {
      color: var(--foreground-l3);
    }
  }
</style>
