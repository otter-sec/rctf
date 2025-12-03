<script lang="ts">
  import { useAdminChallenges } from '$lib/query'
  import { AdminChallRoot } from './_components'

  const challengesQuery = useAdminChallenges()
  const challenges = $derived($challengesQuery.data)
</script>

{#if challenges}
  <AdminChallRoot />
{/if}
