<script lang="ts">
  import ProfileSummary from './ProfileSummary.svelte'

  let { data } = $props()
</script>

<ProfileSummary user={data.user} />
