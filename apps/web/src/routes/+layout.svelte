<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import favicon from '$lib/assets/favicon.svg'
  import { Brainrot, Navigation, Toaster, Tooltip } from '$lib/components'
  import { QueryClientProvider } from '$lib/query'
  import { initAnalytics } from '$lib/utils/analytics'

  let { data, children } = $props()

  onMount(() => {
    initAnalytics(data.clientConfig)
  })
</script>

<svelte:head>
  <link rel="icon" href={data.clientConfig.faviconUrl ?? favicon} />
  <title>{data.clientConfig.ctfName}</title>
</svelte:head>

<QueryClientProvider client={data.queryClient}>
  <Tooltip.Provider delayDuration={300} disableHoverableContent>
    <div class="flex min-h-screen flex-col">
      <Navigation />

      <main class="flex flex-1 flex-col">
        {@render children()}
      </main>
    </div>
  </Tooltip.Provider>
</QueryClientProvider>

<Toaster />
<Brainrot />
