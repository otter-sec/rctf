import type { JsonSchema } from './types'

export function isTypeOneOf(
  type: string | string[] | undefined,
  allowedTypes: string[]
): boolean {
  if (typeof type === 'string') return allowedTypes.includes(type)
  if (Array.isArray(type)) return type.some(t => allowedTypes.includes(t))
  return false
}

export function getPrimaryType(schema: JsonSchema): string | undefined {
  if (typeof schema.type === 'string') return schema.type
  if (Array.isArray(schema.type)) {
    return schema.type.find(t => t !== 'null') ?? schema.type[0]
  }
  if (schema.anyOf) {
    const nonNull = schema.anyOf.find(
      sub => sub.type !== 'null' && !('const' in sub && sub.const === null)
    )
    if (nonNull) return getPrimaryType(nonNull)
  }
  return undefined
}

export function isNullable(schema: JsonSchema): boolean {
  if (schema.nullable) return true
  if (Array.isArray(schema.type) && schema.type.includes('null')) return true
  if (
    schema.anyOf?.some(
      sub => sub.type === 'null' || ('const' in sub && sub.const === null)
    )
  )
    return true
  return false
}

export function getEffectiveSchema(schema: JsonSchema): JsonSchema {
  if (schema.anyOf) {
    const nonNull = schema.anyOf.find(
      sub => sub.type !== 'null' && !('const' in sub && sub.const === null)
    )
    if (nonNull) {
      return {
        ...schema,
        ...nonNull,
        anyOf: undefined,
        title: schema.title ?? nonNull.title,
        description: schema.description ?? nonNull.description,
        default: schema.default ?? nonNull.default,
      }
    }
  }
  return schema
}

export function defaultValue(schema: JsonSchema): unknown {
  if (schema.default !== undefined) {
    return JSON.parse(JSON.stringify(schema.default))
  }

  const primaryType = getPrimaryType(schema)

  if (primaryType === 'object' && schema.properties) {
    const obj: Record<string, unknown> = {}
    for (const [k, p] of Object.entries(schema.properties)) {
      obj[k] = defaultValue(p)
    }
    return obj
  }
  if (primaryType === 'array') return []
  if (primaryType === 'string') return isNullable(schema) ? null : ''
  if (primaryType === 'number' || primaryType === 'integer')
    return isNullable(schema) ? null : 0
  if (primaryType === 'boolean') return false
  return null
}

export function resolveValue(schema: JsonSchema, value: unknown): unknown {
  if (value !== undefined && value !== null && value !== '') return value
  if (schema.default !== undefined) return schema.default
  return value
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

export const NULL_SENTINEL = '__null__'

export function fromNullSentinel(v: unknown): unknown {
  return v === NULL_SENTINEL ? null : v
}

export function toNullSentinel(v: unknown): string {
  return v === null ? NULL_SENTINEL : String(v ?? '')
}

export function renameRecordKey(
  obj: Record<string, unknown>,
  oldKey: string,
  newKey: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k === oldKey ? newKey : k] = v
  }
  return result
}

export function parseNumber(str: string): number | undefined {
  if (str === '') return undefined
  const num = Number(str)
  if (isNaN(num) || !isFinite(num)) return undefined
  return num
}
