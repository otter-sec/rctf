<script lang="ts">
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import { tick } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import SchemaFormField from './schema-form-field.svelte'
  import type { JsonSchema } from './types'
  import {
    collectDefs,
    fieldLabel,
    getEffectiveSchema,
    getItemLabel,
    getPrimaryType,
    isRecordSchema,
    renameRecordEntry,
    resolveRefs,
    schemaAtPath,
    setValueAtPath,
    valueAtPath,
  } from './utils'

  interface Props {
    schema: JsonSchema
    value: Record<string, unknown>
    onChange: (next: Record<string, unknown>) => void
    valid?: boolean
    drilled?: boolean
    disabled?: boolean
    rootLabel?: string
  }

  let {
    schema,
    value,
    onChange,
    valid = $bindable(true),
    drilled = $bindable(false),
    disabled = false,
    rootLabel = 'Config',
  }: Props = $props()

  const errors = new SvelteMap<string, string>()

  function reportError(pathKey: string, error: string | null) {
    if (error) errors.set(pathKey, error)
    else errors.delete(pathKey)
    valid = errors.size === 0
  }

  const resolvedSchema = $derived(resolveRefs(schema, collectDefs(schema)))

  let navStack = $state<string[][]>([])
  const stack = $derived(navStack.filter(p => schemaAtPath(resolvedSchema, p) !== null))
  const currentPath = $derived(stack[stack.length - 1] ?? [])
  const currentSchema = $derived(schemaAtPath(resolvedSchema, currentPath))
  const currentValue = $derived(valueAtPath(value, currentPath))

  const crumbs = $derived(stack.map(p => ({ path: p, label: crumbLabel(p) })))

  function crumbLabel(path: string[]): string {
    const segment = path[path.length - 1] ?? ''
    const parent = schemaAtPath(resolvedSchema, path.slice(0, -1))
    if (!parent) return segment
    const parentEffective = getEffectiveSchema(parent)
    if (getPrimaryType(parentEffective) === 'array') {
      const fallback = fieldLabel(parentEffective, path.slice(0, -1), 'Items')
      return getItemLabel(valueAtPath(value, path), Number(segment), fallback)
    }
    if (isRecordSchema(parentEffective)) return segment
    const own = schemaAtPath(resolvedSchema, path)
    return own ? fieldLabel(own, path, segment) : segment
  }

  let rootEl = $state<HTMLElement | null>(null)

  function setStack(next: string[][]) {
    navStack = next
    drilled = next.length > 0
    void tick().then(() => rootEl?.scrollIntoView({ block: 'start', inline: 'nearest' }))
  }

  function navigate(path: string[]) {
    setStack([...stack, path])
  }

  function handleChange(path: string[], newValue: unknown) {
    onChange(setValueAtPath(value, path, newValue) as Record<string, unknown>)
  }

  const parentSchema = $derived(
    stack.length > 0 ? schemaAtPath(resolvedSchema, currentPath.slice(0, -1)) : null
  )
  const renamableKey = $derived.by(() => {
    if (!parentSchema) return null
    const effective = getEffectiveSchema(parentSchema)
    if (!isRecordSchema(effective) || effective.propertyNames?.enum) return null
    return currentPath[currentPath.length - 1] ?? null
  })

  let keyNameInput = $derived(renamableKey ?? '')

  function renameCurrentKey() {
    if (!renamableKey || keyNameInput === renamableKey) return
    const parentPath = currentPath.slice(0, -1)
    const next = renameRecordEntry(valueAtPath(value, parentPath), renamableKey, keyNameInput)
    if (!next) {
      keyNameInput = renamableKey
      return
    }
    navStack = [...stack.slice(0, -1), [...parentPath, keyNameInput]]
    onChange(setValueAtPath(value, parentPath, next) as Record<string, unknown>)
  }
</script>

{#if resolvedSchema.properties}
  <schema-form-root bind:this={rootEl}>
    {#if crumbs.length > 0}
      <nav aria-label="Configuration path">
        <button type="button" class="crumb" onclick={() => setStack([])}>{rootLabel}</button>
        {#each crumbs as crumb, i (i)}
          <crumb-sep aria-hidden="true">›</crumb-sep>
          {#if i === crumbs.length - 1}
            <crumb-current aria-current="page">{crumb.label}</crumb-current>
          {:else}
            <button type="button" class="crumb" onclick={() => setStack(stack.slice(0, i + 1))}>
              {crumb.label}
            </button>
          {/if}
        {/each}
      </nav>
    {/if}

    {#if renamableKey !== null}
      <key-rename>
        <Field label="Key name">
          {#snippet children({ id })}
            <Input
              {id}
              type="text"
              data-mono
              bind:value={keyNameInput}
              onblur={renameCurrentKey}
              {disabled}
            />
          {/snippet}
        </Field>
      </key-rename>
    {/if}

    {#if currentSchema}
      {#key currentPath.join('\u001f')}
        <SchemaFormField
          schema={currentSchema}
          value={currentValue}
          path={currentPath}
          onChange={handleChange}
          onError={reportError}
          onNavigate={navigate}
          {disabled}
          showLabel={false}
          root
        />
      {/key}
    {/if}
  </schema-form-root>
{:else}
  <schema-form-empty>Schema has no properties to render</schema-form-empty>
{/if}

<style>
  schema-form-root {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    scroll-margin-block-start: var(--space-s);
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3xs);
    align-items: center;
    font-size: var(--step--1);
  }

  .crumb {
    color: var(--foreground-l4);
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

  crumb-sep {
    color: var(--foreground-l5);
  }

  crumb-current {
    color: var(--foreground-l1);
  }

  key-rename {
    display: block;

    :global(input[data-mono]) {
      font-family: var(--font-mono);
    }
  }

  schema-form-empty {
    display: block;
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }
</style>
