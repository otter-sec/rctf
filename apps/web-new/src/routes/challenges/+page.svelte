<script lang="ts">
  import { isAuthenticated } from '$lib/api'
  import CtfNotStarted from '$lib/components/ctf-not-started.svelte'
  import { IconFlagBannerFold } from '$lib/icons'
  import { useChallenges } from '$lib/query/challenges'
  import { useClientConfig } from '$lib/query/config'
  import { ApiError } from '$lib/query/core'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import Challenges from './challenges.svelte'

  const configQuery = useClientConfig()
  const ctfName = $derived(configQuery.data?.ctfName)

  const challengesQuery = useChallenges()
  const challenges = $derived(challengesQuery.data)
  const isPending = $derived(challengesQuery.isPending)
  const error = $derived(challengesQuery.error)
  const isNotStarted = $derived(ApiError.isNotStarted(error))

  const revealAfterLoading = challengesQuery.isPending
</script>

<svelte:head>
  {#if ctfName}
    <title>Challenges | {ctfName}</title>
  {/if}
</svelte:head>

{#if challenges && challenges.length > 0}
  <challenges-reveal data-reveal={revealAfterLoading || undefined}>
    <Challenges />
  </challenges-reveal>
{:else if isPending}
  <page-status>
    <Spinner />
  </page-status>
{:else if isNotStarted}
  <CtfNotStarted />
{:else if error}
  <page-status>
    <Card title="Challenges">
      <p>{error.message}</p>
      {#if !isAuthenticated()}
        <Button href="/login">Login</Button>
      {/if}
    </Card>
  </page-status>
{:else}
  <challenges-empty>
    <EmptyState
      icon={IconFlagBannerFold}
      title="No challenges yet"
      subtitle="Check back soon for challenges!"
    />
  </challenges-empty>
{/if}

<style>
  challenges-reveal {
    display: block;
  }

  page-status,
  challenges-empty {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  page-status {
    font-size: var(--step-2);
    color: var(--foreground-l3);

    :global(ui-card) {
      inline-size: 100%;
      max-inline-size: 28rem;
      font-size: var(--step-0);
      color: var(--foreground-l1);
    }

    p {
      color: var(--foreground-l3);
    }

    :global(a) {
      inline-size: 100%;
    }
  }
</style>
