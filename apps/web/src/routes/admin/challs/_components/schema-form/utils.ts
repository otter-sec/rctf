import type { JsonSchema } from './types'

export function defaultValue(schema: JsonSchema): unknown {
  if (schema.default !== undefined) {
    return JSON.parse(JSON.stringify(schema.default))
  }
  if (schema.type === 'object' && schema.properties) {
    const obj: Record<string, unknown> = {}
    for (const [k, p] of Object.entries(schema.properties)) {
      obj[k] = defaultValue(p)
    }
    return obj
  }
  if (schema.type === 'array') return []
  if (schema.type === 'string') return ''
  if (schema.type === 'number' || schema.type === 'integer') return 0
  if (schema.type === 'boolean') return false
  return null
}

export function getItemLabel(
  item: unknown,
  index: number,
  fallbackLabel: string
): string {
  if (typeof item === 'object' && item !== null) {
    const o = item as Record<string, unknown>
    if (typeof o.name === 'string') return o.name
    if (typeof o.title === 'string') return o.title
  }
  return `${fallbackLabel} ${index + 1}`
}
