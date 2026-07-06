<!--
  PLACEHOLDER — the Solves tab lands in U12.

  U12 replaces this with the infinite virtual solves list + per-row delete.
  Expected prop contract: `{ challengeId: string | null; totalSolves: number }`.
-->
<script lang="ts">
  import IconTrophyFilled from '$lib/icons/icon-trophy-filled.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
</script>

<placeholder-pane>
  <EmptyState
    icon={IconTrophyFilled}
    title="Solves"
    subtitle="The solves list lands in a later unit (U12)."
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
