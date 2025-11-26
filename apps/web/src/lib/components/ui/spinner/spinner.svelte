<script lang="ts">
  import Icon from '@iconify/svelte'
  import { cn } from '$lib/utils.js'

  let { class: className }: { class?: string } = $props()
</script>

<Icon
  icon="tabler:loader"
  role="status"
  aria-label="Loading"
  class={cn('size-4 animate-spin', className)}
/>
