<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { useCurrentUser } from '$lib/query'

  const userQuery = useCurrentUser()
  const user = $derived($userQuery.data ?? null)
  const isAdmin = $derived(
    user?.perms !== null && user?.perms !== undefined && (user.perms & Permissions.challsRead) !== 0
  )
</script>

<nav>
  <a href="/">Home</a>
  <a href="/challs">Challenges</a>
  <a href="/scores">Scores</a>
  {#if isAdmin}
    <a href="/admin/challs">Admin</a>
  {/if}
  {#if user}
    <a href="/profile">Profile</a>
  {:else}
    <a href="/login">Login</a>
    <a href="/register">Register</a>
  {/if}
</nav>

<style>
  nav {
    display: flex;
    padding-block: calc(var(--spacing) * 2);
    padding-inline: calc(var(--spacing) * 4);
    margin-block-start: calc(var(--spacing) * 2);
    border: 1px solid var(--border);
    gap: 1rem;
    
    a:hover {
      text-decoration: underline;
    }
  }
</style>