<script lang="ts">
  import { ExposeKind, type InstancerConfig } from '@rctf/types'
  import {
    Button,
    Field,
    Input,
    SchemaForm,
    Section,
    Select,
    Spinner,
    Textarea,
  } from '$lib/components'
  import { IconPlus, IconTrashFilled, IconX } from '$lib/icons'
  import { useInstancerSchema } from '$lib/query'
  import { cn } from '$lib/utils'
  import * as yaml from 'yaml'
  import ChallengeDetailsInstancer from '../../challenges/challenges-details-overview-instancer.svelte'

  interface Props {
    config: InstancerConfig | null
    challengeId: string | null
    isDisabled: boolean
    onConfigChange: (config: InstancerConfig | null) => void
    isValid?: boolean
  }

  let {
    config,
    challengeId,
    isDisabled,
    onConfigChange,
    isValid = $bindable(true),
  }: Props = $props()

  const schemaQuery = useInstancerSchema()
  const schemaData = $derived(schemaQuery.data)
  const schemaLoading = $derived(schemaQuery.isPending)
  const schemaError = $derived(
    schemaQuery.error?.message ??
      (schemaQuery.isSuccess && !schemaData ? 'Instancer not configured' : null)
  )

  const instancerList = $derived(schemaData?.instancers ?? [])
  const hasMultipleInstancers = $derived(instancerList.length > 1)
  const selectedInstancerName = $derived(
    config?.instancer ?? schemaData?.defaultInstancer ?? instancerList[0]?.name
  )
  const selectedInstancer = $derived(
    instancerList.find(i => i.name === selectedInstancerName) ?? instancerList[0]
  )

  let advancedMode = $state(false)
  let yamlText = $state('')
  let yamlError = $state<string | null>(null)
  let schemaFormValid = $state(true)
  let selectedExposeIndex = $state(0)

  $effect(() => {
    if (!config) {
      isValid = true
    } else if (advancedMode) {
      isValid = !yamlError
    } else {
      isValid = schemaFormValid
    }
  })

  $effect(() => {
    if (config && selectedExposeIndex >= config.expose.length) {
      selectedExposeIndex = Math.max(0, config.expose.length - 1)
    }
  })

  const selectedExpose = $derived(config?.expose[selectedExposeIndex])

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
      } catch {}
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
      instancer: hasMultipleInstancers ? selectedInstancerName : undefined,
      config: selectedInstancer?.defaults ?? {},
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

  function handleInstancerChange(name: string) {
    const target = instancerList.find(i => i.name === name)
    const schemaChanged =
      JSON.stringify(target?.schema) !== JSON.stringify(selectedInstancer?.schema)
    update(c => ({
      ...c,
      instancer: name,
      config: schemaChanged ? (target?.defaults ?? {}) : c.config,
    }))
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
    if (config) {
      selectedExposeIndex = config.expose.length
    }
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
          <div class="text-foreground-l4 flex items-center gap-2 text-sm">
            <Spinner class="size-4" />
            Loading schema...
          </div>
        {:else if schemaError}
          <p class="text-foreground-l4 text-sm">{schemaError}</p>
        {:else}
          <Select.Root
            type="single"
            value={config ? 'yes' : 'no'}
            onValueChange={v => onConfigChange(v === 'yes' ? defaultConfig() : null)}
            disabled={isDisabled}
          >
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
        {#if hasMultipleInstancers}
          <Field.Field>
            <Field.Label>Instancer</Field.Label>
            <Select.Root
              type="single"
              value={selectedInstancerName ?? ''}
              onValueChange={handleInstancerChange}
              disabled={isDisabled}
            >
              <Select.Trigger class="w-full">{selectedInstancerName ?? ''}</Select.Trigger>
              <Select.Content>
                {#each instancerList as inst (inst.name)}
                  <Select.Item value={inst.name} label={inst.name}>
                    {inst.name}{inst.name === schemaData?.defaultInstancer ? ' (default)' : ''}
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </Field.Field>
        {/if}
        <div class="grid grid-cols-1 gap-4 @sm/form:grid-cols-2">
          <Field.Field>
            <Field.Label>Integration ID</Field.Label>
            <Input
              type="text"
              placeholder="challenge-id"
              class="font-mono"
              value={config.challengeIntegrationId}
              oninput={e => update(c => ({ ...c, challengeIntegrationId: e.currentTarget.value }))}
              disabled={isDisabled}
            />
          </Field.Field>
          <Field.Field>
            <Field.Label>Timeout <Field.Hint>(seconds)</Field.Hint></Field.Label>
            <Input
              type="number"
              min={0}
              value={Math.round(config.timeoutMilliseconds / 1000)}
              oninput={e =>
                update(c => ({ ...c, timeoutMilliseconds: +e.currentTarget.value * 1000 }))}
              disabled={isDisabled}
            />
          </Field.Field>
        </div>

        <Field.Field>
          <Field.Label>Allow extending</Field.Label>
          <Select.Root
            type="single"
            value={(config.extendable ?? true) ? 'yes' : 'no'}
            onValueChange={v => update(c => ({ ...c, extendable: v === 'yes' }))}
            disabled={isDisabled}
          >
            <Select.Trigger class="w-full">
              {(config.extendable ?? true) ? 'Enabled' : 'Disabled'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="yes" label="Enabled">Enabled</Select.Item>
              <Select.Item value="no" label="Disabled">Disabled</Select.Item>
            </Select.Content>
          </Select.Root>
        </Field.Field>
      {/if}
    </Section.Content>
  </Section.Root>

  {#if config}
    <Section.Root>
      <Section.Header class="flex items-center justify-between">
        <span>Provider config</span>
        <button
          type="button"
          class="text-foreground-l4 hover:text-foreground-l0 text-xs font-medium"
          onclick={() => (advancedMode ? exitAdvancedMode() : enterAdvancedMode())}
        >
          {advancedMode ? '← Form editor' : 'Advanced (YAML) →'}
        </button>
      </Section.Header>
      <Section.Content>
        {#if advancedMode}
          <div class="flex flex-col gap-2">
            <Textarea
              class="min-h-75 font-mono text-sm"
              value={yamlText}
              oninput={e => handleYamlChange(e.currentTarget.value)}
              disabled={isDisabled}
              placeholder="# YAML configuration..."
            />
            {#if yamlError}
              <p class="text-foreground-destructive text-sm">{yamlError}</p>
            {/if}
          </div>
        {:else if schemaLoading}
          <div class="flex items-center justify-center py-8">
            <Spinner class="size-6" />
            <span class="text-foreground-l4 ml-2 text-sm">Loading schema...</span>
          </div>
        {:else if schemaError}
          <p class="text-foreground-l4 text-sm">{schemaError}</p>
        {:else if selectedInstancer}
          <SchemaForm
            schema={selectedInstancer.schema}
            value={config.config}
            onChange={handleConfigChange}
            disabled={isDisabled}
            bind:isValid={schemaFormValid}
          />
        {/if}
      </Section.Content>
    </Section.Root>

    <Section.Root>
      <Section.Header>Exposed ports</Section.Header>
      <Section.Content class="@container/panel p-0">
        <div class="flex min-h-48 flex-col @md/panel:flex-row">
          <div
            class="flex w-full shrink-0 flex-col border-b-2 @md/panel:w-44 @md/panel:border-r-2 @md/panel:border-b-0"
          >
            <div class="sticky top-0 z-20">
              <div
                class="flex flex-row flex-wrap gap-1 overflow-hidden p-2 @md/panel:flex-col @md/panel:gap-0.5"
              >
                {#if config.expose.length === 0}
                  <p class="text-foreground-l4 px-2 py-1.5 text-sm">No ports</p>
                {:else}
                  {#each config.expose as exp, i (i)}
                    {@const active = selectedExposeIndex === i}
                    <div
                      class={cn(
                        'group flex max-w-full cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm @md/panel:w-full @md/panel:gap-2',
                        active
                          ? 'bg-background-l4 text-foreground-l0'
                          : 'text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l0'
                      )}
                      role="button"
                      tabindex="0"
                      onclick={() => (selectedExposeIndex = i)}
                      onkeydown={e =>
                        (e.key === 'Enter' || e.key === ' ') &&
                        (e.preventDefault(), (selectedExposeIndex = i))}
                    >
                      <span class="truncate font-mono @md/panel:min-w-0 @md/panel:flex-1">
                        {exp.hostPrefix || `Port ${i + 1}`}
                      </span>
                      <span class="text-foreground-l5 hidden shrink-0 text-xs @md/panel:block"
                        >{exp.kind}</span
                      >
                      <button
                        type="button"
                        class={cn(
                          'hover:bg-background-destructive hover:text-foreground-destructive shrink-0 rounded p-0.5',
                          active
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100 @max-md/panel:opacity-100'
                        )}
                        onclick={e => (e.stopPropagation(), removeExpose(i))}
                        disabled={isDisabled}
                      >
                        <IconX class="size-3" />
                      </button>
                    </div>
                  {/each}
                {/if}
              </div>
              <div class="shrink-0 border-t-2 p-2">
                <Button size="sm" class="w-full" onclick={addExpose} disabled={isDisabled}>
                  <IconPlus class="size-4" />
                  Add
                </Button>
              </div>
            </div>
          </div>
          <div class="min-w-0 flex-1 p-4">
            {#if selectedExpose}
              <div class="flex flex-col gap-4">
                <div class="grid grid-cols-1 gap-3 @xl/panel:grid-cols-2">
                  <Field.Field>
                    <Field.Label>Protocol</Field.Label>
                    <Select.Root
                      type="single"
                      value={selectedExpose.kind}
                      onValueChange={v =>
                        updateExpose(selectedExposeIndex, { kind: v as ExposeKind })}
                      disabled={isDisabled}
                    >
                      <Select.Trigger class="w-full">{selectedExpose.kind}</Select.Trigger>
                      <Select.Content>
                        {#each Object.values(ExposeKind) as kind}
                          <Select.Item value={kind} label={kind}>{kind}</Select.Item>
                        {/each}
                      </Select.Content>
                    </Select.Root>
                  </Field.Field>

                  <Field.Field>
                    <Field.Label>Host prefix</Field.Label>
                    <Input
                      type="text"
                      placeholder="my-challenge"
                      class="font-mono text-sm"
                      value={selectedExpose.hostPrefix}
                      oninput={e =>
                        updateExpose(selectedExposeIndex, { hostPrefix: e.currentTarget.value })}
                      disabled={isDisabled}
                    />
                  </Field.Field>

                  <Field.Field>
                    <Field.Label>Container name</Field.Label>
                    <Input
                      type="text"
                      placeholder="app"
                      class="font-mono text-sm"
                      value={selectedExpose.containerName}
                      oninput={e =>
                        updateExpose(selectedExposeIndex, { containerName: e.currentTarget.value })}
                      disabled={isDisabled}
                    />
                  </Field.Field>

                  <Field.Field>
                    <Field.Label>Container port</Field.Label>
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      placeholder="80"
                      class="font-mono"
                      value={selectedExpose.containerPort}
                      oninput={e =>
                        updateExpose(selectedExposeIndex, {
                          containerPort: +e.currentTarget.value,
                        })}
                      disabled={isDisabled}
                    />
                  </Field.Field>

                  <Field.Field>
                    <Field.Label>Display title <Field.Hint>(optional)</Field.Hint></Field.Label>
                    <Input
                      type="text"
                      placeholder="Web interface"
                      class="text-sm"
                      value={selectedExpose.title ?? ''}
                      oninput={e =>
                        updateExpose(selectedExposeIndex, {
                          title: e.currentTarget.value || undefined,
                        })}
                      disabled={isDisabled}
                    />
                  </Field.Field>

                  <Field.Field>
                    <Field.Label>Visibility</Field.Label>
                    <Select.Root
                      type="single"
                      value={(selectedExpose.shouldDisplay ?? true) ? 'visible' : 'hidden'}
                      onValueChange={v =>
                        updateExpose(selectedExposeIndex, { shouldDisplay: v === 'visible' })}
                      disabled={isDisabled}
                    >
                      <Select.Trigger class="w-full">
                        {(selectedExpose.shouldDisplay ?? true) ? 'Visible to players' : 'Hidden'}
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="visible" label="Visible to players"
                          >Visible to players</Select.Item
                        >
                        <Select.Item value="hidden" label="Hidden">Hidden</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Field.Field>
                </div>
              </div>
            {:else}
              <div class="text-foreground-l4 flex h-full items-center justify-center text-sm">
                Add a port to get started
              </div>
            {/if}
          </div>
        </div>
      </Section.Content>
    </Section.Root>

    {#if challengeId}
      <Section.Root>
        <Section.Header>Instance management</Section.Header>
        <Section.Content>
          <ChallengeDetailsInstancer
            {challengeId}
            instanceLifetime={config.timeoutMilliseconds}
            extendable={config.extendable ?? true}
          />
        </Section.Content>
      </Section.Root>
    {/if}
  {/if}
</div>
