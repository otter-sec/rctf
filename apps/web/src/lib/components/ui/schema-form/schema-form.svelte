<script lang="ts">
  import { setValidationContext } from './context'
  import SchemaField from './field.svelte'
  import type { JsonSchema } from './types'

  interface Props {
    schema: JsonSchema
    value: Record<string, unknown>
    onChange: (value: Record<string, unknown>) => void
    disabled?: boolean
    isValid?: boolean
  }

  let { schema, value, onChange, disabled = false, isValid = $bindable(true) }: Props = $props()

  const errors = new Map<string, string>()

  function updateIsValid() {
    isValid = errors.size === 0
  }

  function registerError(path: string, error: string | null) {
    if (error) {
      errors.set(path, error)
    } else {
      errors.delete(path)
    }
    updateIsValid()
  }

  function unregisterField(path: string) {
    errors.delete(path)
    updateIsValid()
  }

  setValidationContext({ registerError, unregisterField })

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

    if (s.additionalProperties && typeof s.additionalProperties === 'object') {
      s = { ...s, additionalProperties: resolveRefs(s.additionalProperties, defs) }
    }

    if (s.propertyNames) {
      s = { ...s, propertyNames: resolveRefs(s.propertyNames, defs) }
    }

    if (s.anyOf) {
      s = { ...s, anyOf: s.anyOf.map(sub => resolveRefs(sub, defs)) }
    }

    if (s.oneOf) {
      s = { ...s, oneOf: s.oneOf.map(sub => resolveRefs(sub, defs)) }
    }

    if (s.allOf) {
      s = { ...s, allOf: s.allOf.map(sub => resolveRefs(sub, defs)) }
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
  <div class="text-sm text-foreground-l4">Schema has no properties to render</div>
{/if}
