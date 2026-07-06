<!--
  PLACEHOLDER — the Admin bot tab lands in U14.

  U14 replaces this with the admin-bot enable toggle + code editor. Expected prop
  contract: `{ config: AdminBotConfig; disabled: boolean; onChange: (config:
  AdminBotConfig) => void }` — the parent maps `onChange` onto the editor-state
  `updateAdminBot` transition.
-->
<script lang="ts">
  import IconRobot from '$lib/icons/icon-robot.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
</script>

<placeholder-pane>
  <EmptyState
    icon={IconRobot}
    title="Admin bot"
    subtitle="Admin-bot configuration lands in a later unit (U14)."
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
