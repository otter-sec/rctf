<script lang="ts">
  import { ExposeKind, type InstancerConfig } from '@rctf/types'
  import { useInstancerSchema } from '$lib/query'
  import * as yaml from 'yaml'
  import { SchemaForm } from './schema-form'

  interface Props {
    config: InstancerConfig | null
    isDisabled: boolean
    onConfigChange: (config: InstancerConfig | null) => void
    isValid?: boolean
  }

  let { config, isDisabled, onConfigChange, isValid = $bindable(true) }: Props = $props()

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
  let schemaFormValid = $state(true)

  $effect(() => {
    if (!config) {
      isValid = true
    } else if (advancedMode) {
      isValid = !yamlError
    } else {
      isValid = schemaFormValid
    }
  })

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

<div>
  <fieldset>
    <legend>Configuration</legend>
    <div>
      <div>
        <strong>Enable instancer</strong>
        {#if schemaLoading}
          <span>Loading schema...</span>
        {:else if schemaError}
          <p>{schemaError}</p>
        {:else}
          <select
            value={config ? 'yes' : 'no'}
            onchange={e => onConfigChange(e.currentTarget.value === 'yes' ? defaultConfig() : null)}
            disabled={isDisabled}>
            <option value="no">Disabled</option>
            <option value="yes">Enabled</option>
          </select>
        {/if}
      </div>

      {#if config}
        <div>
          <div>
            <strong>Integration ID</strong>
            <input
              type="text"
              placeholder="challenge-id"
              value={config.challengeIntegrationId}
              oninput={e => update(c => ({ ...c, challengeIntegrationId: e.currentTarget.value }))}
              disabled={isDisabled} />
          </div>
          <div>
            <strong>Timeout</strong> <small>(seconds)</small>
            <input
              type="number"
              min={0}
              value={Math.round(config.timeoutMilliseconds / 1000)}
              oninput={e =>
                update(c => ({ ...c, timeoutMilliseconds: +e.currentTarget.value * 1000 }))}
              disabled={isDisabled} />
          </div>
        </div>
      {/if}
    </div>
  </fieldset>

  {#if config}
    <fieldset>
      <legend>
        Provider config
        <button
          type="button"
          onclick={() => (advancedMode ? exitAdvancedMode() : enterAdvancedMode())}>
          {advancedMode ? '← Form editor' : 'Advanced (YAML) →'}
        </button>
      </legend>
      <div>
        {#if advancedMode}
          <div>
            <textarea
              rows={15}
              value={yamlText}
              oninput={e => handleYamlChange(e.currentTarget.value)}
              disabled={isDisabled}
              placeholder="# YAML configuration..."></textarea>
            {#if yamlError}
              <p>{yamlError}</p>
            {/if}
          </div>
        {:else if schemaLoading}
          <p>Loading schema...</p>
        {:else if schemaError}
          <p>{schemaError}</p>
        {:else if schemaData}
          <SchemaForm
            schema={schemaData.schema}
            value={config.config}
            onChange={handleConfigChange}
            disabled={isDisabled}
            bind:isValid={schemaFormValid} />
        {/if}
      </div>
    </fieldset>

    <fieldset>
      <legend>
        Exposed ports
        <button type="button" onclick={addExpose} disabled={isDisabled}>+ Add</button>
      </legend>
      {#if config.expose.length}
        <table>
          <thead>
            <tr>
              <th>Host Prefix</th>
              <th>Kind</th>
              <th>Container</th>
              <th>Port</th>
              <th>Show</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each config.expose as exp, i (i)}
              <tr>
                <td>
                  <input
                    type="text"
                    placeholder="host prefix"
                    value={exp.hostPrefix}
                    oninput={e => updateExpose(i, { hostPrefix: e.currentTarget.value })}
                    disabled={isDisabled} />
                </td>
                <td>
                  <select
                    value={exp.kind}
                    onchange={e => updateExpose(i, { kind: e.currentTarget.value as ExposeKind })}
                    disabled={isDisabled}>
                    {#each Object.values(ExposeKind) as kind}
                      <option value={kind}>{kind}</option>
                    {/each}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="container"
                    value={exp.containerName}
                    oninput={e => updateExpose(i, { containerName: e.currentTarget.value })}
                    disabled={isDisabled} />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    placeholder="Port"
                    value={exp.containerPort}
                    oninput={e => updateExpose(i, { containerPort: +e.currentTarget.value })}
                    disabled={isDisabled} />
                </td>
                <td>
                  <label>
                    <input
                      type="checkbox"
                      checked={exp.shouldDisplay ?? true}
                      onchange={e => updateExpose(i, { shouldDisplay: e.currentTarget.checked })}
                      disabled={isDisabled} />
                  </label>
                </td>
                <td>
                  <button type="button" onclick={() => removeExpose(i)} disabled={isDisabled}>
                    ×
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p>No exposed ports configured.</p>
      {/if}
    </fieldset>
  {/if}
</div>
