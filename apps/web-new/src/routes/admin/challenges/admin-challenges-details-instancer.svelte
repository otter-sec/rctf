<!--
  Instancer tab (R19, AE9). Availability comes from `useInstancerSchema` — a null
  payload means no instancer provider is configured, so the pane shows an empty
  state instead of an error. Enabling seeds a default config (deep-cloned provider
  defaults) through `onChange`; disabling clears it to null. Provider config edits
  route through the schema-driven SchemaForm, or a live-parsed YAML textarea in
  advanced mode. The pane owns the enabled/advanced/YAML state and publishes its
  contribution to the save gate through the bindable `valid` prop, resolved purely
  by `resolveInstancerValidity`. Existing challenges also embed the player-facing
  instancer panel for live instance management.
-->
<script lang="ts">
  import type { InstancerConfig } from '@rctf/types'
  import IconCloudComputingFilled from '$lib/icons/icon-cloud-computing-filled.svelte'
  import { useInstancerSchema } from '$lib/query/admin'
  import Button from '$lib/ui/button.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Input from '$lib/ui/input.svelte'
  import { type MenuItem } from '$lib/ui/menu.svelte'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import Textarea from '$lib/ui/textarea.svelte'
  import * as yaml from 'yaml'
  import ChallengesDetailsOverviewInstancer from '../../challenges/challenges-details-overview-instancer.svelte'
  import AdminChallengesDetailsInstancerExpose from './admin-challenges-details-instancer-expose.svelte'
  import FieldSelect from './field-select.svelte'
  import {
    defaultInstancerConfig,
    resolveInstancer,
    resolveInstancerValidity,
    schemasDiffer,
    secondsToTimeout,
    timeoutToSeconds,
    type ExposeConfig,
  } from './instancer-config'
  import { SchemaForm, type JsonSchema } from './schema-form'

  interface Props {
    config: InstancerConfig | null
    challengeId: string | null
    disabled: boolean
    valid?: boolean
    onChange: (config: InstancerConfig | null) => void
  }

  let { config, challengeId, disabled, valid = $bindable(true), onChange }: Props = $props()

  const schemaQuery = useInstancerSchema()

  // Non-reactive read: true only when this mount starts behind the spinner, so
  // a warm-cache remount doesn't replay the reveal fade.
  const revealAfterLoading = schemaQuery.isPending
  const schema = $derived(schemaQuery.data ?? null)
  const instancers = $derived(schema?.instancers ?? [])
  const hasMultiple = $derived(instancers.length > 1)
  const active = $derived(resolveInstancer(schema, config?.instancer))

  let advanced = $state(false)
  let yamlText = $state('')
  let yamlError = $state<string | null>(null)
  let schemaFormValid = $state(true)

  $effect(() => {
    valid = resolveInstancerValidity({
      config,
      advancedMode: advanced,
      yamlError,
      schemaFormValid,
    })
  })

  const enableItems = $derived<MenuItem[]>([
    {
      value: 'no',
      label: 'Disabled',
      checked: !config,
      onSelect: () => onChange(null),
    },
    {
      value: 'yes',
      label: 'Enabled',
      checked: !!config,
      onSelect: () => {
        if (!config) onChange(defaultInstancerConfig(schema))
      },
    },
  ])

  const instancerItems = $derived<MenuItem[]>(
    instancers.map(entry => ({
      value: entry.name,
      label: entry.name === schema?.defaultInstancer ? `${entry.name} (default)` : entry.name,
      checked: active?.name === entry.name,
      onSelect: () => switchInstancer(entry.name),
    }))
  )

  const extendItems = $derived<MenuItem[]>([
    {
      value: 'yes',
      label: 'Enabled',
      checked: config?.extendable ?? true,
      onSelect: () => patch({ extendable: true }),
    },
    {
      value: 'no',
      label: 'Disabled',
      checked: !(config?.extendable ?? true),
      onSelect: () => patch({ extendable: false }),
    },
  ])

  function patch(fields: Partial<InstancerConfig>) {
    if (config) onChange({ ...config, ...fields })
  }

  function switchInstancer(name: string) {
    const target = resolveInstancer(schema, name)
    const reset = schemasDiffer(active?.schema, target?.schema)
    patch({
      instancer: name,
      config: reset ? structuredClone(target?.defaults ?? {}) : config?.config,
    })
  }

  function onExposeChange(expose: ExposeConfig[]) {
    patch({ expose })
  }

  function enterAdvanced() {
    if (config) {
      yamlText = yaml.stringify(config.config)
      yamlError = null
    }
    advanced = true
  }

  function exitAdvanced() {
    applyYaml(yamlText)
    advanced = false
  }

  function applyYaml(text: string) {
    yamlText = text
    try {
      const parsed = yaml.parse(text)
      if (typeof parsed === 'object' && parsed !== null) {
        yamlError = null
        patch({ config: parsed as Record<string, unknown> })
      } else {
        yamlError = 'YAML must be an object'
      }
    } catch (error) {
      yamlError = error instanceof Error ? error.message : 'Invalid YAML'
    }
  }
</script>

<instancer-pane>
  {#if schemaQuery.isPending}
    <pane-loading><Spinner label="Loading instancer schema" /></pane-loading>
  {:else if !schema}
    <EmptyState
      icon={IconCloudComputingFilled}
      title="Instancer not configured"
      subtitle="No on-demand instancer provider is configured on the backend."
    />
  {:else}
    <instancer-reveal data-reveal={revealAfterLoading || undefined}>
      <Section title="Configuration">
        <config-fields>
          <form-field>
            <field-label>Enable instancer</field-label>
            <FieldSelect label={config ? 'Enabled' : 'Disabled'} items={enableItems} {disabled} />
          </form-field>

          {#if config}
            {#if hasMultiple}
              <form-field>
                <field-label>Instancer</field-label>
                <FieldSelect
                  label={active?.name ?? 'Select instancer'}
                  items={instancerItems}
                  {disabled}
                />
              </form-field>
            {/if}

            <field-grid>
              <form-field>
                <field-label>Integration ID</field-label>
                <Input
                  type="text"
                  data-mono
                  placeholder="challenge-id"
                  value={config.challengeIntegrationId}
                  {disabled}
                  oninput={e => patch({ challengeIntegrationId: e.currentTarget.value })}
                />
              </form-field>
              <form-field>
                <field-label>Timeout <field-hint>(seconds)</field-hint></field-label>
                <Input
                  type="number"
                  min={0}
                  value={timeoutToSeconds(config.timeoutMilliseconds)}
                  {disabled}
                  oninput={e =>
                    patch({ timeoutMilliseconds: secondsToTimeout(+e.currentTarget.value) })}
                />
              </form-field>
            </field-grid>

            <form-field>
              <field-label>Allow extending</field-label>
              <FieldSelect
                label={(config.extendable ?? true) ? 'Enabled' : 'Disabled'}
                items={extendItems}
                {disabled}
              />
            </form-field>
          {/if}
        </config-fields>
      </Section>

      {#if config}
        <Section title="Provider config">
          <provider-config>
            <provider-toolbar>
              <button type="button" onclick={() => (advanced ? exitAdvanced() : enterAdvanced())}>
                {advanced ? 'Form editor' : 'Advanced (YAML)'}
              </button>
            </provider-toolbar>
            {#if advanced}
              <Textarea
                data-mono
                rows={12}
                value={yamlText}
                aria-invalid={Boolean(yamlError)}
                {disabled}
                placeholder="# YAML configuration…"
                oninput={e => applyYaml(e.currentTarget.value)}
              ></Textarea>
              {#if yamlError}<field-error>{yamlError}</field-error>{/if}
            {:else if active}
              <SchemaForm
                schema={active.schema as unknown as JsonSchema}
                value={config.config}
                onChange={next => patch({ config: next })}
                {disabled}
                bind:valid={schemaFormValid}
              />
            {:else}
              <provider-empty>No provider schema available.</provider-empty>
            {/if}
          </provider-config>
        </Section>

        <Section title="Exposed ports">
          <AdminChallengesDetailsInstancerExpose
            expose={config.expose ?? []}
            {disabled}
            onChange={onExposeChange}
          />
        </Section>

        {#if challengeId}
          <Section title="Instance management">
            <ChallengesDetailsOverviewInstancer
              {challengeId}
              instancerLifetime={config.timeoutMilliseconds}
              instancerExtendable={(config.extendable ?? true) && (active?.canExtend ?? true)}
              instancerStoppable={active?.canStop ?? true}
              instancerActions={[]}
              onSolve={() => {}}
            />
          </Section>
        {/if}
      {/if}
    </instancer-reveal>
  {/if}
</instancer-pane>

<style>
  instancer-reveal {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  instancer-pane {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);
    min-block-size: 0;
    padding: var(--space-2xs) var(--space-s) var(--space-s);
    overflow-y: auto;
  }

  pane-loading {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-block-size: 0;
  }

  config-fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  provider-config {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  provider-toolbar {
    display: flex;
    justify-content: flex-end;

    button {
      color: var(--foreground-l3);
      font-size: var(--step--1);
      cursor: pointer;

      &:hover {
        color: var(--foreground-l0);
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: 2px;
        border-radius: var(--radius-sm);
      }
    }
  }

  provider-empty {
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }

  field-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-s);

    @media (width >= 40rem) {
      grid-template-columns: 1fr 1fr;
    }
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

  field-hint {
    color: var(--foreground-l4);
  }

  field-error {
    font-size: var(--step--1);
    color: var(--foreground-destructive);
  }

  :global(input[data-mono]),
  :global(textarea[data-mono]) {
    font-family: var(--font-mono);
  }
</style>
