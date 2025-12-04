<script lang="ts">
  import { onMount } from 'svelte'

  onMount(() => {
    const params = new URLSearchParams(location.search)
    window.opener?.postMessage(
      {
        kind: 'discordCallback',
        state: params.get('state'),
        discordCode: params.get('code'),
      },
      location.origin
    )
    window.close()
  })
</script>
