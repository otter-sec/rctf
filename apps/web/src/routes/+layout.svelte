<script lang="ts">
  import { Permissions } from '@rctf/types'
  import '../app.css'
  import { goto, invalidateAll } from '$app/navigation'
  import { clearToken, NavLink, ThemeToggle } from '$lib'
  import favicon from '$lib/assets/favicon.svg'
  import { Button, Toaster } from '$lib/components'

  let { data, children } = $props()

  const isAdmin = $derived(
    data.user?.perms !== null &&
      data.user?.perms !== undefined &&
      (data.user.perms & Permissions.challsRead) !== 0
  )

  function handleLogout() {
    clearToken()
    invalidateAll()
    goto('/login')
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>{data.clientConfig.ctfName}</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
  <nav class="flex items-center justify-between rounded-lg border p-3">
    <ul class="flex flex-wrap gap-1">
      <li><NavLink href="/">Overview</NavLink></li>
      <li><NavLink href="/challs">Challenges</NavLink></li>
      <li><NavLink href="/scores">Leaderboard</NavLink></li>
      <li><NavLink href="/profile">Profile</NavLink></li>
      {#if isAdmin}
        <li><NavLink href="/admin/challs">Admin</NavLink></li>
      {/if}
    </ul>
    <div class="flex items-center gap-2">
      <ThemeToggle />
      {#if data.user}
        <Button variant="ghost" size="sm" onclick={handleLogout}>Logout</Button>
      {:else}
        <Button variant="ghost" size="sm" href="/login">Login</Button>
      {/if}
    </div>
  </nav>

  <main class="flex flex-col gap-6">
    {@render children()}
  </main>
</div>

<Toaster />
