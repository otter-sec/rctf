<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query'
  import { createQueryClient } from '$lib/query'

  let { children } = $props()

  const queryClient = createQueryClient()
</script>

<QueryClientProvider client={queryClient}>
  <nav>
    <a href="/">Home</a> |
    <a href="/login">Login</a> |
    <a href="/register">Register</a> |
    <a href="/recover">Recover</a> |
    <a href="/profile">Profile</a> |
    <a href="/challs">Challenges</a> |
    <a href="/scores">Scores</a> |
    <a href="/admin/challs">Admin</a>
  </nav>
  <hr />
  {@render children()}
</QueryClientProvider>
