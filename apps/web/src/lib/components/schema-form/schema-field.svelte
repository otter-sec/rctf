<script lang="ts">
  import { Field, Input, Select, Textarea } from '$lib/components'
  import SchemaArray from './schema-array.svelte'
  import SchemaObject from './schema-object.svelte'
  import SchemaRecord from './schema-record.svelte'
  import type { JsonSchema } from './types'

  interface Props {
    schema: JsonSchema
    value: unknown
    path: string[]
    onChange: (path: string[], value: unknown) => void
    disabled?: boolean
    showLabel?: boolean
  }

  let { schema, value, path, onChange, disabled = false, showLabel = true }: Props = $props()

  const label = $derived(schema.title ?? path[path.length - 1] ?? '')
  const description = $derived(schema.description)
  const isRecord = $derived(
    schema.type === 'object' && !schema.properties && schema.additionalProperties
  )

  function set(v: unknown) {
    onChange(path, v)
  }
</script>

{#if isRecord}
  <SchemaRecord {schema} {value} {path} {onChange} {disabled} />
{:else if schema.type === 'object' && schema.properties}
  <SchemaObject {schema} {value} {path} {onChange} {disabled} {showLabel} />
{:else if schema.type === 'array'}
  <SchemaArray {schema} {value} {path} {onChange} {disabled} />
{:else}
  <Field.Field>
    {#if showLabel && label}
      <Field.Label>
        {label}
        {#if description}
          <Field.Hint>({description})</Field.Hint>
        {/if}
      </Field.Label>
    {/if}

    {#if schema.type === 'string'}
      {#if schema.enum}
        <Select.Root type="single" value={String(value ?? '')} onValueChange={set} {disabled}>
          <Select.Trigger class="w-full">{value ?? 'Select...'}</Select.Trigger>
          <Select.Content>
            {#each schema.enum as opt}
              <Select.Item value={String(opt)} label={String(opt)}>{opt}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      {:else if (schema.maxLength ?? 0) > 100 || schema.format === 'textarea'}
        <Textarea
          value={String(value ?? '')}
          placeholder={schema.default ? String(schema.default) : ''}
          oninput={e => set(e.currentTarget.value)}
          rows={3}
          {disabled} />
      {:else}
        <Input
          type="text"
          value={String(value ?? '')}
          placeholder={schema.default ? String(schema.default) : ''}
          oninput={e => set(e.currentTarget.value)}
          {disabled} />
      {/if}
    {:else if schema.type === 'number' || schema.type === 'integer'}
      <Input
        type="number"
        value={(value as number) ?? ''}
        min={schema.minimum}
        max={schema.maximum}
        step={schema.type === 'integer' ? 1 : 'any'}
        oninput={e => set(e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))}
        {disabled} />
    {:else if schema.type === 'boolean'}
      <Select.Root
        type="single"
        value={String(value ?? false)}
        onValueChange={v => set(v === 'true')}
        {disabled}>
        <Select.Trigger class="w-full">{value ? 'Yes' : 'No'}</Select.Trigger>
        <Select.Content>
          <Select.Item value="true" label="Yes">Yes</Select.Item>
          <Select.Item value="false" label="No">No</Select.Item>
        </Select.Content>
      </Select.Root>
    {:else}
      <Input
        type="text"
        value={JSON.stringify(value ?? '')}
        oninput={e => {
          try {
            set(JSON.parse(e.currentTarget.value))
          } catch {
            set(e.currentTarget.value)
          }
        }}
        {disabled} />
    {/if}
  </Field.Field>
{/if}
