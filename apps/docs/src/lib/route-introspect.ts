import { exampleRegistry } from '@rctf/types'
import { globalRegistry } from 'zod/mini'

type AnySchema = unknown

export interface FieldInfo {
  name: string
  schema: AnySchema
  typeLabel: string
  required: boolean
  description?: string
}

export type ExampleValue =
  | string
  | number
  | boolean
  | null
  | ExampleValue[]
  | { [key: string]: ExampleValue }

const UNWRAPPABLE = new Set(['optional', 'nullable', 'default', 'prefault', 'catch', 'readonly'])

function def(schema: AnySchema): any {
  return (schema as any)?._zod?.def
}

function description(schema: AnySchema): string | undefined {
  if (!schema) return undefined
  const direct = globalRegistry.get(schema as any)?.description
  if (direct) return direct
  const d = def(schema)
  return d && UNWRAPPABLE.has(d.type) ? description(d.innerType) : undefined
}

function unwrap(schema: AnySchema): AnySchema {
  let cur = schema
  while (UNWRAPPABLE.has(def(cur)?.type)) {
    cur = def(cur).innerType
  }
  return cur
}

export function typeLabel(schema: AnySchema): string {
  const d = def(schema)
  if (!d) return 'unknown'
  switch (d.type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'null':
    case 'undefined':
    case 'object':
      return d.type
    case 'int':
      return 'int'
    case 'bigint':
      return 'bigint'
    case 'date':
      return 'Date'
    case 'array':
      return `${typeLabel(d.element)}[]`
    case 'literal':
      return d.values.map((v: unknown) => JSON.stringify(v)).join(' | ')
    case 'enum':
      return Object.values(d.entries)
        .map((v: unknown) => JSON.stringify(v))
        .join(' | ')
    case 'union':
      return d.options.map(typeLabel).join(' | ')
    case 'pipe':
      return typeLabel(d.in)
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'catch':
    case 'readonly':
      return typeLabel(d.innerType)
    default:
      return d.type ?? 'unknown'
  }
}

function objectShapeLabel(schema: AnySchema): string {
  const d = def(schema)
  if (d?.type !== 'object') return typeLabel(schema)
  const fields = Object.entries(d.shape as Record<string, AnySchema>).map(([k, v]) => {
    const optional = def(v)?.type === 'optional' ? '?' : ''
    return `${k}${optional}: ${typeLabel(unwrap(v))}`
  })
  return `{ ${fields.join(', ')} }`
}

function typeLabelExtended(schema: AnySchema): string {
  const d = def(schema)
  if (!d) return 'unknown'
  switch (d.type) {
    case 'nullable':
      return `${typeLabelExtended(d.innerType)} | null`
    case 'optional':
      return `${typeLabelExtended(d.innerType)} | undefined`
    case 'default':
    case 'prefault':
    case 'catch':
    case 'readonly':
      return typeLabelExtended(d.innerType)
    case 'record':
      return `Record<${typeLabel(d.keyType)}, ${objectShapeLabel(d.valueType)}>`
    default:
      return typeLabel(schema)
  }
}

export interface ResponseField {
  path: string
  typeLabel: string
  description?: string
}

const COMMON_FIELD_DESCRIPTIONS: Record<string, string> = {
  authToken: 'Auth token returned by the route.',
  teamToken: 'Team token returned by the route.',
  captchaCode: 'Captcha challenge token.',
  recaptchaCode: 'reCAPTCHA challenge token.',
  ctftimeToken: 'CTFtime authentication token.',
  email: 'Email address.',
  id: 'Unique identifier.',
  jobId: 'Job identifier.',
  userId: 'Team identifier.',
  challengeId: 'Challenge identifier.',
  name: 'Display name.',
  kind: 'Response or object kind.',
  type: 'Object type.',
  total: 'Total number of matching records.',
  limit: 'Maximum number of records to return.',
  offset: 'Number of records to skip before returning results.',
  search: 'Search string.',
  division: 'Division name or filter.',
  score: 'Current score.',
  points: 'Point value.',
  time: 'Timestamp for the sample.',
  solveTime: 'Solve timestamp.',
  createdAt: 'Creation timestamp.',
  expiresAt: 'Expiration timestamp.',
  avatarUrl: 'Avatar image URL.',
  countryCode: 'Country or region code.',
  statusText: 'Team status text.',
  globalPlace: 'Global leaderboard rank.',
  divisionPlace: 'Division leaderboard rank.',
  url: 'Resource URL.',
  size: 'Size in bytes.',
}

function fieldKey(path: string): string {
  return path.replace(/\[\]/g, '').split('.').at(-1) ?? path
}

function sentenceFromFieldName(name: string): string {
  const words = name
    .replace(/\[\]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('.', ' ')
    .replaceAll('_', ' ')
    .trim()
    .toLowerCase()
  return words || 'field'
}

export function requestFieldDescription(name: string, source: 'body' | 'query' | 'params'): string {
  const key = fieldKey(name)
  const common = COMMON_FIELD_DESCRIPTIONS[key]
  if (common) return common

  const label = sentenceFromFieldName(name)
  switch (source) {
    case 'params':
      return `Route parameter for ${label}.`
    case 'query':
      return `Query parameter for ${label}.`
    case 'body':
      return `Request body field for ${label}.`
  }
}

export function responseFieldDescription(path: string): string {
  const key = fieldKey(path)
  const common = COMMON_FIELD_DESCRIPTIONS[key]
  if (common) return common
  return `Returned ${sentenceFromFieldName(path)} value.`
}

export function walkResponseSchema(schema: AnySchema, prefix = ''): ResponseField[] {
  if (!schema) return []
  const d = def(schema)
  if (!d) return []

  // Peel off nullable/optional wrappers when inner is structural (object/array)
  // so we keep walking into the structure. For wrapped primitives, fall through
  // and emit a leaf row with the extended type label.
  if (UNWRAPPABLE.has(d.type)) {
    const innerD = def(d.innerType)
    if (innerD?.type === 'object' || innerD?.type === 'array') {
      return walkResponseSchema(d.innerType, prefix)
    }
  }

  if (d.type === 'array') {
    const elementBase = unwrap(d.element)
    if (def(elementBase)?.type === 'object') {
      return walkResponseSchema(d.element, prefix ? `${prefix}[]` : '')
    }
    return [
      {
        path: prefix,
        typeLabel: typeLabelExtended(schema),
        description: description(schema),
      },
    ]
  }

  if (d.type === 'object') {
    return Object.entries(d.shape as Record<string, AnySchema>).flatMap(([name, field]) => {
      const fieldPath = prefix ? `${prefix}.${name}` : name
      return walkResponseSchema(field, fieldPath)
    })
  }

  return [
    {
      path: prefix,
      typeLabel: typeLabelExtended(schema),
      description: description(schema),
    },
  ]
}

export function walkObjectSchema(schema: AnySchema): FieldInfo[] {
  const d = def(schema)
  if (d?.type !== 'object') return []
  return Object.entries(d.shape as Record<string, AnySchema>).map(([name, field]) => ({
    name,
    schema: field,
    typeLabel: typeLabel(unwrap(field)),
    required: def(field)?.type !== 'optional',
    description: description(field),
  }))
}

function kebab(name: string): string {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase()
}

export function dimPlaceholders(value: unknown): unknown {
  if (typeof value === 'string') {
    if (/<(dim|red|green)>/.test(value)) return value
    return value.startsWith('<') ? `<dim>${value}</dim>` : value
  }
  if (Array.isArray(value)) return value.map(dimPlaceholders)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, dimPlaceholders(v)])
    )
  }
  return value
}

export function generateExample(schema: AnySchema, fieldName?: string): ExampleValue {
  if (!schema) return null
  const registered = exampleRegistry.get(schema as any)
  if (registered) return registered.value as ExampleValue
  const d = def(schema)
  if (!d) return null
  switch (d.type) {
    case 'string':
      return fieldName ? `<${kebab(fieldName)}>` : 'string'
    case 'number':
    case 'int':
    case 'bigint':
      return 0
    case 'boolean':
      return false
    case 'null':
      return null
    case 'date':
      return '1970-01-01T00:00:00.000Z'
    case 'array':
      return [generateExample(d.element)]
    case 'object': {
      const out: Record<string, ExampleValue> = {}
      for (const [k, v] of Object.entries(d.shape as Record<string, AnySchema>)) {
        out[k] = generateExample(v, k)
      }
      return out
    }
    case 'literal':
      return d.values[0] as ExampleValue
    case 'enum':
      return Object.values(d.entries)[0] as ExampleValue
    case 'union':
      return generateExample(d.options[0], fieldName)
    case 'pipe':
      return generateExample(d.in, fieldName)
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'catch':
    case 'readonly':
      return generateExample(d.innerType, fieldName)
    default:
      return null
  }
}
