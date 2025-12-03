<script lang="ts">
  import { useAdminChallenges } from '$lib/query'
  import { Root } from './_components'

  const challengesQuery = useAdminChallenges()
  const challenges = $derived($challengesQuery.data)
</script>

{#if challenges}
  <Root />
{/if}
