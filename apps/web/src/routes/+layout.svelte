<script lang="ts">
  import '../app.css'
  import { NavLink } from '$lib'
  import favicon from '$lib/assets/favicon.svg'

  let { data, children } = $props()
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>{data.clientConfig.ctfName}</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
  <nav class="border p-3">
    <ul class="flex flex-wrap gap-4">
      <li><NavLink href="/">Overview</NavLink></li>
      <li><NavLink href="/challs">Challenges</NavLink></li>
      <li><NavLink href="/scores">Leaderboard</NavLink></li>
      <li><NavLink href="/profile">Profile</NavLink></li>
    </ul>
  </nav>

  <main class="flex flex-col gap-4">
    {@render children()}
  </main>
</div>
