<script lang="ts">
  import Loader from '@iconify-svelte/tabler/loader'
  import { cn } from '$lib/utils.js'

  let { class: className }: { class?: string } = $props()
</script>

<Loader
  role="status"
  aria-label="Loading"
  class={cn('size-4 animate-spin', className)}
/>
