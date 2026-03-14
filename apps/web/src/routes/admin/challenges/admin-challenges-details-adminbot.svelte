<script lang="ts">
  import { Field, Section, Select, Spinner, Textarea } from '$lib/components'
  import type { AdminBotConfig } from '$lib/machines'
  import { useAdminBotStatus } from '$lib/query'

  interface Props {
    config: AdminBotConfig
    isDisabled: boolean
    onConfigChange: (config: AdminBotConfig) => void
  }

  let { config, isDisabled, onConfigChange }: Props = $props()

  const statusQuery = useAdminBotStatus()
  const statusData = $derived(statusQuery.data)
  const statusLoading = $derived(statusQuery.isPending)
  const statusError = $derived(
    statusQuery.error?.message ??
      (statusQuery.isSuccess && !statusData ? 'Admin bot not configured on backend' : null)
  )

  const configLanguage = $derived(statusData?.configLanguage ?? 'typescript')

  function update(partial: Partial<AdminBotConfig>) {
    onConfigChange({ ...config, ...partial })
  }
</script>

<div class="flex flex-col gap-4">
  <Section.Root>
    <Section.Header>Configuration</Section.Header>
    <Section.Content class="flex flex-col gap-4">
      <Field.Field>
        <Field.Label>Enable admin bot</Field.Label>
        {#if statusLoading}
          <div class="text-foreground-l4 flex items-center gap-2 text-sm">
            <Spinner class="size-4" />
            Loading status...
          </div>
        {:else if statusError}
          <p class="text-foreground-l4 text-sm">{statusError}</p>
        {:else}
          <Select.Root
            type="single"
            value={config.enabled ? 'yes' : 'no'}
            onValueChange={v => update({ enabled: v === 'yes' })}
            disabled={isDisabled}
          >
            <Select.Trigger class="w-full">
              {config.enabled ? 'Enabled' : 'Disabled'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="no" label="Disabled">Disabled</Select.Item>
              <Select.Item value="yes" label="Enabled">Enabled</Select.Item>
            </Select.Content>
          </Select.Root>
        {/if}
      </Field.Field>
    </Section.Content>
  </Section.Root>

  {#if config.enabled}
    <Section.Root>
      <Section.Header class="flex items-center justify-between">
        <span>Challenge code</span>
        <span class="text-foreground-l4 text-xs font-medium">{configLanguage}</span>
      </Section.Header>
      <Section.Content>
        <Textarea
          class="min-h-[400px] font-mono text-sm"
          value={config.code}
          oninput={e => update({ code: e.currentTarget.value })}
          disabled={isDisabled}
          placeholder={`// Write your admin bot challenge code here (${configLanguage})...`}
        />
      </Section.Content>
    </Section.Root>
  {/if}
</div>
