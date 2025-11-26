<script lang="ts">
  import '../app.css'
  import favicon from '$lib/assets/favicon.svg'
  import { Header, Toaster, Tooltip } from '$lib/components'

  let { data, children } = $props()
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>{data.clientConfig.ctfName}</title>
</svelte:head>

<Tooltip.Provider delayDuration={300} disableHoverableContent>
  <div class="flex min-h-screen flex-col">
    <Header user={data.user} />

    <main class="flex flex-1 flex-col">
      {@render children()}
    </main>
  </div>
</Tooltip.Provider>

<Toaster />
