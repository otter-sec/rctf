<script lang="ts">
  import '../app.css'
  import favicon from '$lib/assets/favicon.svg'
  import { Brainrot, Navigation, Toaster, Tooltip } from '$lib/components'
  import { QueryClientProvider } from '$lib/query'
  import { initAnalytics } from '$lib/utils/analytics'
  import { onMount } from 'svelte'

  let { data, children } = $props()

  onMount(() => {
    initAnalytics(data.clientConfig)
  })
</script>

<svelte:head>
  <link rel="icon" href={data.clientConfig.faviconUrl ?? favicon} />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="apple-mobile-web-app-title" content={data.clientConfig.ctfName} />
  <title>{data.clientConfig.ctfName}</title>

  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />

  <meta name="description" content={data.clientConfig.meta.description} />

  <meta name="theme-color" content="#111111" />
  <link rel="canonical" href={data.clientConfig.origin} />

  <!-- TODO(es3n1n): inject these somehow at serve time so that twitter/other platforms can parse these -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content={data.clientConfig.ctfName} />
  <meta property="og:description" content={data.clientConfig.meta.description} />
  <meta property="og:image" content={data.clientConfig.meta.imageUrl} />
  <meta property="og:url" content={data.clientConfig.origin} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.clientConfig.ctfName} />
  <meta name="twitter:description" content={data.clientConfig.meta.description} />
  <meta name="twitter:image" content={data.clientConfig.meta.imageUrl} />
  <meta name="twitter:url" content={data.clientConfig.origin} />
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
