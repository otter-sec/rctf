<!--
  Admin bot tab (R19, AE9). Availability comes from `useAdminBotStatus` — a null
  payload means the admin bot is not configured on the backend, so the pane shows
  an empty state. Enabling reveals a monospace code editor for the bot script,
  labelled with the backend's configured language (default "typescript"). Both the
  enabled flag and the code route up through `onChange`, which the parent maps onto
  the editor-state `updateAdminBot` transition.
-->
<script lang="ts">
  import IconRobot from '$lib/icons/icon-robot.svelte'
  import { useAdminBotStatus } from '$lib/query/admin'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import { type MenuItem } from '$lib/ui/menu.svelte'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import Textarea from '$lib/ui/textarea.svelte'
  import type { AdminBotConfig } from './editor-state'
  import FieldSelect from './field-select.svelte'

  interface Props {
    config: AdminBotConfig
    disabled: boolean
    onChange: (config: AdminBotConfig) => void
  }

  let { config, disabled, onChange }: Props = $props()

  const statusQuery = useAdminBotStatus()

  // Non-reactive read: true only when this mount starts behind the spinner, so
  // a warm-cache remount doesn't replay the reveal fade.
  const revealAfterLoading = statusQuery.isPending
  const status = $derived(statusQuery.data ?? null)
  const language = $derived(status?.configLanguage ?? 'typescript')

  const enableItems = $derived<MenuItem[]>([
    {
      value: 'no',
      label: 'Disabled',
      checked: !config.enabled,
      onSelect: () => onChange({ ...config, enabled: false }),
    },
    {
      value: 'yes',
      label: 'Enabled',
      checked: config.enabled,
      onSelect: () => onChange({ ...config, enabled: true }),
    },
  ])
</script>

<adminbot-pane>
  {#if statusQuery.isPending}
    <pane-loading><Spinner label="Loading admin bot status" /></pane-loading>
  {:else if !status}
    <EmptyState
      icon={IconRobot}
      title="Admin bot not configured"
      subtitle="No admin bot service is configured on the backend."
    />
  {:else}
    <adminbot-reveal data-reveal={revealAfterLoading || undefined}>
      <Section title="Configuration">
        <form-field>
          <field-label>Enable admin bot</field-label>
          <FieldSelect
            label={config.enabled ? 'Enabled' : 'Disabled'}
            items={enableItems}
            {disabled}
          />
        </form-field>
      </Section>

      {#if config.enabled}
        <Section title="Challenge code">
          <code-editor>
            <code-language>{language}</code-language>
            <Textarea
              data-mono
              rows={16}
              value={config.code}
              {disabled}
              placeholder={`// Write your admin bot challenge code here (${language})…`}
              oninput={e => onChange({ ...config, code: e.currentTarget.value })}
            ></Textarea>
          </code-editor>
        </Section>
      {/if}
    </adminbot-reveal>
  {/if}
</adminbot-pane>

<style>
  adminbot-reveal {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  adminbot-pane {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);
    min-block-size: 0;
    padding: var(--space-2xs) var(--space-l) var(--space-s);
    overflow-y: auto;
  }

  pane-loading {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-block-size: 0;
  }

  code-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  code-language {
    align-self: flex-end;
    color: var(--foreground-l4);
    font-size: var(--step--2);
  }

  form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    inline-size: 100%;
  }

  field-label {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    font-size: var(--step--1);
    color: var(--foreground-l2);
  }

  :global(textarea[data-mono]) {
    font-family: var(--font-mono);
  }
</style>
