<script lang="ts">
  import SchemaField from './schema-field.svelte'
  import type { JsonSchema } from './types'

  interface Props {
    schema: JsonSchema
    value: Record<string, unknown>
    onChange: (value: Record<string, unknown>) => void
    disabled?: boolean
  }

  let { schema, value, onChange, disabled = false }: Props = $props()

  function resolveRefs(s: JsonSchema, defs: Record<string, JsonSchema>): JsonSchema {
    if ('$ref' in s) {
      const match = s.$ref!.match(/^#\/(?:\$defs|definitions)\/(.+)$/)

      if (match?.[1] && defs[match[1]]) {
        return resolveRefs(defs[match[1]]!, defs)
      }
    }

    if (s.properties) {
      const resolved: Record<string, JsonSchema> = {}
      for (const [k, v] of Object.entries(s.properties)) {
        resolved[k] = resolveRefs(v, defs)
      }
      s = { ...s, properties: resolved }
    }

    if (s.items) {
      s = { ...s, items: resolveRefs(s.items, defs) }
    }

    if (s.additionalProperties) {
      s = { ...s, additionalProperties: resolveRefs(s.additionalProperties as JsonSchema, defs) }
    }

    return s
  }

  const defs = $derived({ ...(schema.definitions ?? {}), ...(schema.$defs ?? {}) })
  const resolvedSchema = $derived(resolveRefs(schema, defs))

  function handleChange(path: string[], newValue: unknown) {
    if (path.length === 0) {
      onChange(newValue as Record<string, unknown>)
      return
    }

    const result = JSON.parse(JSON.stringify(value))
    let current: Record<string, unknown> = result

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]!
      if (current[key] === undefined) {
        const nextKey = path[i + 1]!
        current[key] = /^\d+$/.test(nextKey) ? [] : {}
      }
      current = current[key] as Record<string, unknown>
    }

    const lastKey = path[path.length - 1]!
    if (Array.isArray(current)) {
      ;(current as unknown[])[Number(lastKey)] = newValue
    } else {
      current[lastKey] = newValue
    }

    onChange(result)
  }
</script>

{#if resolvedSchema.properties}
  <SchemaField
    schema={resolvedSchema}
    {value}
    path={[]}
    onChange={handleChange}
    {disabled}
    showLabel={false} />
{:else}
  <div class="text-sm text-muted-foreground">Schema has no properties to render</div>
{/if}
