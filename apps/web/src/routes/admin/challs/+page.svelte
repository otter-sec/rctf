<script lang="ts">
  import { useAdminChallenges, useClientConfig } from '$lib/query'
  import AdminChallRoot from './admin-chall-root.svelte'

  const challengesQuery = useAdminChallenges()
  const clientConfigQuery = useClientConfig()

  const challenges = $derived($challengesQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)
</script>

<svelte:head>
  {#if clientConfig}
    <title>Admin | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if challenges}
  <AdminChallRoot />
{/if}
