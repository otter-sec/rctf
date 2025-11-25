<script lang="ts">
  import '../app.css'
  import favicon from '$lib/assets/favicon.svg'
  import { Header, Toaster } from '$lib/components'

  let { data, children } = $props()
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>{data.clientConfig.ctfName}</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
  <Header user={data.user} />

  <main class="flex flex-1 flex-col px-9 py-6">
    {@render children()}
  </main>
</div>

<Toaster />
