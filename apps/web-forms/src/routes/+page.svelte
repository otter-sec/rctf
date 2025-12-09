<script lang="ts">
  import { useClientConfig, useCurrentUser } from '$lib/query'

  const configQuery = useClientConfig()
  const userQuery = useCurrentUser()

  const config = $derived($configQuery.data)
  const user = $derived($userQuery.data)
</script>

<h1>Home</h1>

{#if $configQuery.isPending}
  <p>Loading config...</p>
{:else if config}
  <p>CTF: {config.ctfName}</p>
  <p>Start: {new Date(config.startTime).toLocaleString()}</p>
  <p>End: {new Date(config.endTime).toLocaleString()}</p>
{/if}

{#if $userQuery.isPending}
  <p>Loading user...</p>
{:else if user}
  <p>Logged in as: {user.name}</p>
  <p>Score: {user.score}</p>
{:else}
  <p>Not logged in</p>
{/if}
