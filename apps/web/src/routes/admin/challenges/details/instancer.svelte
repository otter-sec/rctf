<script lang="ts">
  import type { InstancerConfig } from '@rctf/types'
  import { IconCloud } from '$lib/icons'
  import { useInstancerSchema } from '$lib/query/admin'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Input from '$lib/ui/input.svelte'
  import { type MenuItem } from '$lib/ui/menu.svelte'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import ChallengesDetailsOverviewInstancer from '../../../challenges/details/overview-instancer.svelte'
  import FieldSelect from './field-select.svelte'
  import FormScroll from './form-scroll.svelte'
  import {
    defaultInstancerConfig,
    resolveInstancer,
    schemasDiffer,
    secondsToTimeout,
    timeoutToSeconds,
    type ExposeConfig,
  } from './instancer-config'
  import AdminChallengesDetailsInstancerExpose from './instancer-expose.svelte'

  interface Props {
    config: InstancerConfig | null
    challengeId: string | null
    disabled: boolean
    onChange: (config: InstancerConfig | null) => void
  }

  let { config, challengeId, disabled, onChange }: Props = $props()

  const schemaQuery = useInstancerSchema()

  const revealAfterLoading = schemaQuery.isPending
  const schema = $derived(schemaQuery.data ?? null)
  const instancers = $derived(schema?.instancers ?? [])
  const hasMultiple = $derived(instancers.length > 1)
  const active = $derived(resolveInstancer(schema, config?.instancer))

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
      label:
        entry.name === schema?.defaultInstancer
          ? `${entry.name} (default)`
          : entry.name,
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
</script>

<FormScroll disabled={false}>
  {#if schemaQuery.isPending}
    <pane-loading><Spinner label="Loading instancer schema" /></pane-loading>
  {:else if !schema}
    <EmptyState
      icon={IconCloud}
      title="Instancer not configured"
      subtitle="No on-demand instancer provider is configured on the backend."
    />
  {:else}
    <instancer-reveal data-reveal={revealAfterLoading || undefined}>
      <editable-sections data-disabled={disabled || undefined}>
        <Section title="Configuration">
          <config-fields>
            <form-field>
              <field-label>Enable instancer</field-label>
              <FieldSelect
                label={config ? 'Enabled' : 'Disabled'}
                items={enableItems}
                {disabled}
              />
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
                    oninput={e =>
                      patch({ challengeIntegrationId: e.currentTarget.value })}
                  />
                </form-field>
                <form-field>
                  <field-label
                    >Timeout <field-hint>(seconds)</field-hint></field-label
                  >
                  <Input
                    type="number"
                    min={0}
                    value={timeoutToSeconds(config.timeoutMilliseconds)}
                    {disabled}
                    oninput={e =>
                      patch({
                        timeoutMilliseconds: secondsToTimeout(
                          +e.currentTarget.value
                        ),
                      })}
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
          <Section title="Exposed ports" flush>
            <AdminChallengesDetailsInstancerExpose
              expose={config.expose ?? []}
              {disabled}
              onChange={onExposeChange}
            />
          </Section>
        {/if}
      </editable-sections>

      {#if config && challengeId}
        <Section title="Instance management">
          <ChallengesDetailsOverviewInstancer
            {challengeId}
            instancerLifetime={config.timeoutMilliseconds}
            instancerExtendable={(config.extendable ?? true) &&
              (active?.canExtend ?? true)}
            instancerStoppable={active?.canStop ?? true}
            instancerActions={[]}
            onSolve={() => {}}
          />
        </Section>
      {/if}
    </instancer-reveal>
  {/if}
</FormScroll>

<style>
  instancer-reveal {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  editable-sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);

    &[data-disabled] {
      opacity: 0.6;
    }
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

  field-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-s);

    @container challenge-details (width >= 40rem) {
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
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--space-3xs);
    font-size: var(--step--1);
    color: var(--foreground-l2);
  }

  field-hint {
    color: var(--foreground-l4);
  }

  :global(input[data-mono]) {
    font-family: var(--font-mono);
  }
</style>
