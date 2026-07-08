<script lang="ts">
  import { useAdminChallenges } from '$lib/query/admin'
  import { useClientConfig } from '$lib/query/config'
  import Card from '$lib/ui/card.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import AdminChallenges from './challenges.svelte'

  const configQuery = useClientConfig()
  const ctfName = $derived(configQuery.data?.ctfName)

  const challengesQuery = useAdminChallenges()
  const challenges = $derived(challengesQuery.data)
  const isPending = $derived(challengesQuery.isPending)
  const error = $derived(challengesQuery.error)

  const revealAfterLoading = challengesQuery.isPending
</script>

<svelte:head>
  {#if ctfName}
    <title>Challenges | {ctfName}</title>
  {/if}
</svelte:head>

{#if challenges}
  <admin-challenges-reveal data-reveal={revealAfterLoading || undefined}>
    <AdminChallenges />
  </admin-challenges-reveal>
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
  admin-challenges-reveal {
    display: block;
  }

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
