<!--
  PLACEHOLDER — the Instancer tab lands in U14.

  U14 replaces this with the instancer enable/config editor (schema-form driven)
  plus live instance management. Expected prop contract: `{ config:
  InstancerConfig | null; challengeId: string | null; disabled: boolean;
  onChange: (config: InstancerConfig | null) => void }`, contributing an
  `instancerValid` signal back to the save gate.
-->
<script lang="ts">
  import IconCloudComputingFilled from '$lib/icons/icon-cloud-computing-filled.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
</script>

<placeholder-pane>
  <EmptyState
    icon={IconCloudComputingFilled}
    title="Instancer"
    subtitle="On-demand instancer configuration lands in a later unit (U14)."
  />
</placeholder-pane>

<style>
  placeholder-pane {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-block-size: 0;
    padding: var(--space-l);
  }
</style>
