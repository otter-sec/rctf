<script lang="ts">
  import type { InstancerConfig } from '@rctf/types'
  import CodeEditor from '$lib/components/code-editor.svelte'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import { useInstancerSchema } from '$lib/query/admin'
  import Spinner from '$lib/ui/spinner.svelte'
  import * as yaml from 'yaml'
  import { SchemaForm, type JsonSchema } from '../schema-form'
  import { resolveInstancer, resolveInstancerValidity } from './instancer-config'

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

  $effect(() => {
    valid = resolveInstancerValidity({
      config,
      advancedMode: advanced,
      yamlError,
      schemaFormValid,
    })
  })

  function patch(fields: Partial<InstancerConfig>) {
    if (config) onChange({ ...config, ...fields })
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

{#snippet modeToggle()}
  <button
    type="button"
    data-mode-toggle
    onclick={() => (advanced ? exitAdvanced() : enterAdvanced())}
  >
    {advanced ? 'Form editor' : 'Advanced (YAML)'}
  </button>
{/snippet}

<provider-viewport data-fade-scope>
  <provider-pane data-disabled={disabled || undefined} data-fade-source tabindex="-1">
    {#if schemaQuery.isPending}
      <pane-loading><Spinner label="Loading instancer schema" /></pane-loading>
    {:else if !config}
      <provider-empty>Enable the instancer to configure the provider.</provider-empty>
    {:else}
      <provider-editor>
        <yaml-editor hidden={!advanced || undefined}>
          <CodeEditor
            language="yaml"
            rows={12}
            value={yamlText}
            invalid={Boolean(yamlError)}
            {disabled}
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

    :global(textarea) {
      flex: 1;
      min-block-size: 0;
      resize: none;
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
