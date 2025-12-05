<script lang="ts">
  import { ExposeKind } from '@rctf/types'
  import { type InstancerConfig } from '$lib/api'
  import {
    Button,
    Checkbox,
    Field,
    Input,
    Section,
    Select,
    Spinner,
    Textarea,
  } from '$lib/components'
  import { IconPlus, IconTrashFilled } from '$lib/icons'
  import { useInstancerSchema } from '$lib/query'
  import * as yaml from 'yaml'
  import { SchemaForm } from './schema-form'

  interface Props {
    config: InstancerConfig | null
    isDisabled: boolean
    onConfigChange: (config: InstancerConfig | null) => void
  }

  let { config, isDisabled, onConfigChange }: Props = $props()

  const schemaQuery = useInstancerSchema()
  const schemaData = $derived($schemaQuery.data)
  const schemaLoading = $derived($schemaQuery.isPending)
  const schemaError = $derived(
    $schemaQuery.error?.message ??
      ($schemaQuery.isSuccess && !schemaData ? 'Instancer not configured' : null)
  )

  let advancedMode = $state(false)
  let yamlText = $state('')
  let yamlError = $state<string | null>(null)

  function enterAdvancedMode() {
    if (config?.config) {
      yamlText = yaml.stringify(config.config)
      yamlError = null
    }
    advancedMode = true
  }

  function exitAdvancedMode() {
    if (yamlText) {
      try {
        const parsed = yaml.parse(yamlText)
        if (typeof parsed === 'object' && parsed !== null) {
          update(c => ({ ...c, config: parsed }))
        }
      } catch {
        // Ignore parse errors on exit
      }
    }
    advancedMode = false
  }

  function handleYamlChange(text: string) {
    yamlText = text
    try {
      const parsed = yaml.parse(text)
      if (typeof parsed === 'object' && parsed !== null) {
        yamlError = null
        update(c => ({ ...c, config: parsed }))
      } else {
        yamlError = 'YAML must be an object'
      }
    } catch (e) {
      yamlError = e instanceof Error ? e.message : 'Invalid YAML'
    }
  }

  function update(fn: (c: InstancerConfig) => InstancerConfig) {
    if (config) {
      onConfigChange(fn(config))
    }
  }

  function defaultConfig(): InstancerConfig {
    return {
      challengeIntegrationId: '',
      config: schemaData?.defaults ?? {},
      expose: [
        {
          kind: ExposeKind.HTTPS,
          hostPrefix: 'test-challenge',
          containerName: 'app',
          containerPort: 80,
          shouldDisplay: true,
        },
      ],
      timeoutMilliseconds: 120000,
    }
  }

  function handleConfigChange(newConfig: Record<string, unknown>) {
    update(c => ({ ...c, config: newConfig }))
  }

  function addExpose() {
    update(c => ({
      ...c,
      expose: [
        ...c.expose,
        {
          kind: ExposeKind.HTTPS,
          hostPrefix: 'test-challenge',
          containerName: 'app',
          containerPort: 80,
          shouldDisplay: true,
        },
      ],
    }))
  }

  function removeExpose(i: number) {
    update(c => ({ ...c, expose: c.expose.filter((_, j) => j !== i) }))
  }

  function updateExpose(i: number, partial: Partial<InstancerConfig['expose'][number]>) {
    update(c => ({
      ...c,
      expose: c.expose.map((e, j) => (j === i ? { ...e, ...partial } : e)),
    }))
  }
</script>

<div class="flex flex-col gap-4">
  <Section.Root>
    <Section.Header>Configuration</Section.Header>
    <Section.Content class="flex flex-col gap-4">
      <Field.Field>
        <Field.Label>Enable instancer</Field.Label>
        {#if schemaLoading}
          <div class="flex items-center gap-2 text-sm text-foreground-l4">
            <Spinner class="size-4" />
            Loading schema...
          </div>
        {:else if schemaError}
          <p class="text-sm text-foreground-l4">{schemaError}</p>
        {:else}
          <Select.Root
            type="single"
            value={config ? 'yes' : 'no'}
            onValueChange={v => onConfigChange(v === 'yes' ? defaultConfig() : null)}
            disabled={isDisabled}>
            <Select.Trigger class="w-full">
              {config ? 'Enabled' : 'Disabled'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="no" label="Disabled">Disabled</Select.Item>
              <Select.Item value="yes" label="Enabled">Enabled</Select.Item>
            </Select.Content>
          </Select.Root>
        {/if}
      </Field.Field>

      {#if config}
        <div class="grid grid-cols-2 gap-4">
          <Field.Field>
            <Field.Label>Integration ID</Field.Label>
            <Input
              type="text"
              placeholder="challenge-id"
              class="font-mono"
              value={config.challengeIntegrationId}
              oninput={e => update(c => ({ ...c, challengeIntegrationId: e.currentTarget.value }))}
              disabled={isDisabled} />
          </Field.Field>
          <Field.Field>
            <Field.Label>Timeout <Field.Hint>(seconds)</Field.Hint></Field.Label>
            <Input
              type="number"
              min={0}
              value={Math.round(config.timeoutMilliseconds / 1000)}
              oninput={e =>
                update(c => ({ ...c, timeoutMilliseconds: +e.currentTarget.value * 1000 }))}
              disabled={isDisabled} />
          </Field.Field>
        </div>
      {/if}
    </Section.Content>
  </Section.Root>

  {#if config}
    <Section.Root>
      <Section.Header class="flex items-center justify-between">
        <span>Provider config</span>
        <button
          type="button"
          class="text-xs font-medium text-foreground-l4 hover:text-foreground-l0"
          onclick={() => (advancedMode ? exitAdvancedMode() : enterAdvancedMode())}>
          {advancedMode ? '← Form editor' : 'Advanced (YAML) →'}
        </button>
      </Section.Header>
      <Section.Content>
        {#if advancedMode}
          <div class="flex flex-col gap-2">
            <Textarea
              class="min-h-[300px] font-mono text-sm"
              value={yamlText}
              oninput={e => handleYamlChange(e.currentTarget.value)}
              disabled={isDisabled}
              placeholder="# YAML configuration..." />
            {#if yamlError}
              <p class="text-sm text-destructive">{yamlError}</p>
            {/if}
          </div>
        {:else if schemaLoading}
          <div class="flex items-center justify-center py-8">
            <Spinner class="size-6" />
            <span class="ml-2 text-sm text-foreground-l4">Loading schema...</span>
          </div>
        {:else if schemaError}
          <p class="text-sm text-foreground-l4">{schemaError}</p>
        {:else if schemaData}
          <SchemaForm
            schema={schemaData.schema}
            value={config.config}
            onChange={handleConfigChange}
            disabled={isDisabled} />
        {/if}
      </Section.Content>
    </Section.Root>

    <Section.Root>
      <Section.Header class="flex items-center justify-between">
        <span>Exposed ports</span>
        <Button size="sm" onclick={addExpose} disabled={isDisabled}>
          <IconPlus class="size-4" />
          Add
        </Button>
      </Section.Header>
      {#if config.expose.length}
        <div class="divide-y divide-border">
          {#each config.expose as exp, i (i)}
            <div class="flex flex-wrap items-center gap-3 px-4 py-2">
              <Input
                type="text"
                placeholder="host prefix"
                class="w-36 font-mono text-sm"
                value={exp.hostPrefix}
                oninput={e => updateExpose(i, { hostPrefix: e.currentTarget.value })}
                disabled={isDisabled} />

              <Select.Root
                type="single"
                value={exp.kind}
                onValueChange={v => updateExpose(i, { kind: v as ExposeKind })}
                disabled={isDisabled}>
                <Select.Trigger class="w-24">{exp.kind}</Select.Trigger>
                <Select.Content>
                  {#each Object.values(ExposeKind) as kind}
                    <Select.Item value={kind} label={kind}>{kind}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>

              <span class="text-foreground-l4">→</span>

              <Input
                type="text"
                placeholder="container"
                class="w-28 font-mono text-sm"
                value={exp.containerName}
                oninput={e => updateExpose(i, { containerName: e.currentTarget.value })}
                disabled={isDisabled} />

              <span class="text-foreground-l4">:</span>

              <Input
                type="number"
                min={1}
                max={65535}
                placeholder="Port"
                class="w-20"
                value={exp.containerPort}
                oninput={e => updateExpose(i, { containerPort: +e.currentTarget.value })}
                disabled={isDisabled} />

              <div class="flex-1"></div>

              <label
                class="flex items-center gap-2 text-sm text-foreground-l4"
                title="Show to player">
                <Checkbox
                  checked={exp.shouldDisplay ?? true}
                  onCheckedChange={v => updateExpose(i, { shouldDisplay: !!v })}
                  disabled={isDisabled} />
                <span class="hidden sm:inline">Show to players</span>
              </label>

              <Button
                variant="destructive"
                size="icon-sm"
                onclick={() => removeExpose(i)}
                disabled={isDisabled}>
                <IconTrashFilled class="size-4 text-destructive" />
              </Button>
            </div>
          {/each}
        </div>
      {:else}
        <Section.Content>
          <p class="text-sm text-foreground-l4">No exposed ports configured.</p>
        </Section.Content>
      {/if}
    </Section.Root>
  {/if}
</div>
