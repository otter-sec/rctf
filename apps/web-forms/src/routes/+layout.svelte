<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query'
  import Navigation from '$lib/components/navigation.svelte'
  import { createQueryClient } from '$lib/query'

  let { children } = $props()

  const queryClient = createQueryClient()
</script>

<QueryClientProvider client={queryClient}>
  <Navigation />
  {@render children()}
</QueryClientProvider>

<style>
  @import '$lib/styles/normalize.css';
  @import '$lib/styles/tailwind.css';
</style>
