<script lang="ts">
  import { IconLoader } from '$lib/icons'
  import { cn } from '$lib/utils.js'

  let { class: className }: { class?: string } = $props()
</script>

<IconLoader
  role="status"
  aria-label="Loading"
  class={cn('size-4 animate-spin', className)}
/>
