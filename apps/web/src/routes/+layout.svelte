<script lang="ts">
  import '../app.css'
  import favicon from '$lib/assets/favicon.svg'
  import { Brainrot, Header, Toaster, Tooltip } from '$lib/components'
  import { QueryClientProvider } from '$lib/query'

  let { data, children } = $props()
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>{data.clientConfig.ctfName}</title>
</svelte:head>

<QueryClientProvider client={data.queryClient}>
  <Tooltip.Provider delayDuration={300} disableHoverableContent>
    <div class="flex min-h-screen flex-col">
      <Header />

      <main class="flex flex-1 flex-col">
        {@render children()}
      </main>
    </div>
  </Tooltip.Provider>
</QueryClientProvider>

<Toaster />
<Brainrot />
