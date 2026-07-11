<script lang="ts">
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import * as toast from '@zag-js/toast'
  import { toaster } from '$lib/toast'
  import Portal from '$lib/ui/portal.svelte'
  import ToastItem from '$lib/ui/toast-item.svelte'

  const id = $props.id()
  const service = useMachine(toast.group.machine, { id, store: toaster })
  const api = $derived(toast.group.connect(service, normalizeProps))
</script>

<Portal>
  <div {...api.getGroupProps()}>
    {#each api.getToasts() as item, index (item.id)}
      <ToastItem actor={item} parent={service} {index} />
    {/each}
  </div>
</Portal>

<style>
  [data-part='group'] {
    z-index: var(--layer-toast) !important;
  }
</style>
