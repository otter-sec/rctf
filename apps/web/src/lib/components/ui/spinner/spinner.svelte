<script lang="ts">
  import { IconLoader } from '$lib/icons'
  import { cn } from '$lib/utils'

  let { class: className }: { class?: string } = $props()
</script>

<span role="status" aria-label="Loading">
  <IconLoader class={cn('size-4 animate-spin', className)} />
</span>
