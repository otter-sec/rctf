<script lang="ts">
  import { onMount } from 'svelte'

  onMount(() => {
    const params = new URLSearchParams(location.search)
    window.opener?.postMessage(
      {
        kind: 'ctftimeCallback',
        state: params.get('state'),
        ctftimeCode: params.get('code'),
      },
      location.origin
    )
    window.close()
  })
</script>
