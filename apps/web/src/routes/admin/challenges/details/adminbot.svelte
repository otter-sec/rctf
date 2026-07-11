<script lang="ts">
  import CodeEditor from '$lib/components/code-editor.svelte'
  import { IconRobot } from '$lib/icons'
  import { useAdminBotStatus } from '$lib/query/admin'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import { type MenuItem } from '$lib/ui/menu.svelte'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import type { AdminBotConfig } from '../model/editor-state'
  import FieldSelect from './field-select.svelte'
  import FormScroll from './form-scroll.svelte'

  interface Props {
    config: AdminBotConfig
    disabled: boolean
    onChange: (config: AdminBotConfig) => void
  }

  let { config, disabled, onChange }: Props = $props()

  const statusQuery = useAdminBotStatus()

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

<FormScroll {disabled}>
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
          <CodeEditor
            value={config.code}
            {language}
            label="Admin bot challenge code"
            {disabled}
            rows={28}
            placeholder={`// Write your admin bot challenge code here (${language})…`}
            oninput={code => onChange({ ...config, code })}
          />
        </Section>
      {/if}
    </adminbot-reveal>
  {/if}
</FormScroll>

<style>
  adminbot-reveal {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  pane-loading {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-block-size: 0;
  }

  form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    inline-size: 100%;
  }

  field-label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--space-3xs);
    font-size: var(--step--1);
    color: var(--foreground-l2);
  }
</style>
