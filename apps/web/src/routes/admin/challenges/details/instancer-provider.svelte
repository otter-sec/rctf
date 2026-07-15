<script lang="ts">
  import type { InstancerConfig } from '@rctf/types'
  import CodeEditor from '$lib/components/code-editor.svelte'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import { useInstancerSchema } from '$lib/query/admin'
  import Spinner from '$lib/ui/spinner.svelte'
  import * as yaml from 'yaml'
  import { SchemaForm, type JsonSchema } from '../schema-form'
  import {
    resolveInstancer,
    resolveInstancerValidity,
  } from './instancer-config'

  interface Props {
    config: InstancerConfig | null
    disabled: boolean
    valid?: boolean
    onChange: (config: InstancerConfig | null) => void
  }

  let { config, disabled, valid = $bindable(true), onChange }: Props = $props()

  const schemaQuery = useInstancerSchema()
  const schema = $derived(schemaQuery.data ?? null)
  const active = $derived(resolveInstancer(schema, config?.instancer))

  let advanced = $state(false)
  let yamlText = $state('')
  let yamlError = $state<string | null>(null)
  let schemaFormValid = $state(true)
  let yamlSource: string | null = null

  $effect(() => {
    const snapshot = config ? JSON.stringify(config.config) : null
    if (snapshot === yamlSource) {
      return
    }
    yamlSource = snapshot
    yamlText = stringifyConfig(config)
    yamlError = null
  })

  $effect(() => {
    valid = resolveInstancerValidity({
      config,
      advancedMode: advanced,
      yamlError,
      schemaFormValid,
    })
  })

  function stringifyConfig(target: InstancerConfig | null): string {
    const record = target?.config
    if (!record || Object.keys(record).length === 0) {
      return ''
    }
    return yaml.stringify(record, { lineWidth: 0 })
  }

  function patch(fields: Partial<InstancerConfig>) {
    if (config) onChange({ ...config, ...fields })
  }

  function applyYaml(text: string) {
    yamlText = text
    let parsed: unknown
    try {
      parsed = yaml.parse(text) ?? {}
    } catch (error) {
      yamlError = error instanceof Error ? error.message : 'Invalid YAML'
      return
    }
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      yamlError = 'YAML must be an object'
      return
    }
    yamlError = null
    const next = parsed as Record<string, unknown>
    yamlSource = JSON.stringify(next)
    patch({ config: next })
  }
</script>

{#snippet modeToggle()}
  <button type="button" data-mode-toggle onclick={() => (advanced = !advanced)}>
    {advanced ? 'Form editor' : 'Advanced (YAML)'}
  </button>
{/snippet}

<provider-viewport data-fade-scope>
  <provider-pane
    data-disabled={disabled || undefined}
    data-fade-source
    tabindex="-1"
  >
    {#if schemaQuery.isPending}
      <pane-loading><Spinner label="Loading instancer schema" /></pane-loading>
    {:else if !config}
      <provider-empty
        >Enable the instancer to configure the provider.</provider-empty
      >
    {:else}
      <provider-editor>
        <yaml-editor hidden={!advanced || undefined}>
          <CodeEditor
            language="yaml"
            rows={12}
            value={yamlText}
            label="Provider YAML configuration"
            invalid={Boolean(yamlError)}
            {disabled}
            indent
            placeholder="# YAML configuration…"
            oninput={applyYaml}
          />
          {#if yamlError}<field-error>{yamlError}</field-error>{/if}
          <yaml-footer>{@render modeToggle()}</yaml-footer>
        </yaml-editor>
        {#if active}
          <form-editor hidden={advanced || undefined}>
            <SchemaForm
              schema={active.schema as unknown as JsonSchema}
              value={config.config}
              onChange={next => patch({ config: next })}
              {disabled}
              bind:valid={schemaFormValid}
              treeFooter={modeToggle}
            />
          </form-editor>
        {:else if !advanced}
          <provider-empty>No provider schema available.</provider-empty>
        {/if}
      </provider-editor>
    {/if}
  </provider-pane>
  <EdgeFades />
</provider-viewport>

<style>
  provider-viewport {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  provider-pane {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);
    min-block-size: 0;
    padding: var(--space-s) 1.25rem;

    &[data-disabled] {
      opacity: 0.6;
    }
  }

  pane-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-block: var(--space-l);
  }

  provider-editor {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow: clip;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
  }

  yaml-editor {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-2xs);
    min-block-size: 0;
    padding: var(--space-2xs);

    :global(code-editor-shell) {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-block-size: 0;
    }

    :global(.cm-editor) {
      flex: 1;
      block-size: auto;
      min-block-size: 0;
    }
  }

  yaml-footer {
    display: flex;
    flex: none;
  }

  form-editor {
    display: block;
    flex: 1;
    min-block-size: 0;
  }

  [data-mode-toggle] {
    color: var(--foreground-l3);
    font-size: var(--step--1);
    cursor: pointer;

    &:hover {
      color: var(--foreground-l0);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      border-radius: var(--radius-sm);
    }
  }

  provider-empty {
    color: var(--foreground-l4);
    font-size: var(--step--1);

    provider-editor & {
      padding: var(--space-2xs) var(--space-s);
    }
  }

  field-error {
    font-size: var(--step--1);
    color: var(--foreground-destructive);
  }

  @container challenge-details (width < 46rem) {
    provider-pane {
      overflow-y: auto;
      overscroll-behavior: none;
    }

    provider-editor,
    form-editor {
      flex: none;
    }
  }
</style>
