<script lang="ts">
  import { Section } from '$lib'
  import ChallengeGrid from './ChallengeGrid.svelte'

  let { data } = $props()
</script>

<Section title="Challenges">
  <ChallengeGrid challenges={data.challenges} />
</Section>
