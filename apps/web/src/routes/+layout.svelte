<script lang="ts">
  import '../app.css'
  import { goto, invalidateAll } from '$app/navigation'
  import { NavLink, Toast, clearToken } from '$lib'
  import favicon from '$lib/assets/favicon.svg'

  let { data, children } = $props()

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
  <nav class="flex items-center justify-between">
    <ul class="flex flex-wrap gap-4">
      <li><NavLink href="/">Overview</NavLink></li>
      <li><NavLink href="/challs">Challenges</NavLink></li>
      <li><NavLink href="/scores">Leaderboard</NavLink></li>
      <li><NavLink href="/profile">Profile</NavLink></li>
    </ul>
    <div class="flex gap-4">
      {#if data.user}
        <button type="button" onclick={handleLogout}>Logout</button>
      {:else}
        <a href="/login">Login</a>
      {/if}
    </div>
  </nav>

  <main class="flex flex-col gap-4">
    {@render children()}
  </main>
</div>

<Toast />
