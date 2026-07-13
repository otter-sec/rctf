<script lang="ts">
  import SchemaFormRecordInline from './schema-form-record-inline.svelte'
  import SchemaFormRecordList from './schema-form-record-list.svelte'
  import { classifyHeavy } from './tree'
  import type { FieldProps } from './types'

  interface Props extends FieldProps {}

  let {
    schema,
    value,
    path,
    onChange,
    onSelect,
    disabled = false,
  }: Props = $props()

  const isSimpleValue = $derived(classifyHeavy(schema) !== 'record')
</script>

{#if isSimpleValue}
  <SchemaFormRecordInline {schema} {value} {path} {onChange} {disabled} />
{:else}
  <SchemaFormRecordList
    {schema}
    {value}
    {path}
    {onChange}
    onOpen={entryPath => onSelect?.(entryPath)}
    onAdded={entryPath => onSelect?.(entryPath)}
    {disabled}
  />
{/if}
