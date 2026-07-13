import { exampleRegistry } from '@rctf/types'
import type { z } from 'zod/mini'
import { globalRegistry, safeParse } from 'zod/mini'

export type ZodSchema = z.core.$ZodType
type ZodConcrete = z.core.$ZodTypes
type ZodDef = ZodConcrete['_zod']['def']
type LiteralValue = string | number | bigint | boolean | null | undefined

export interface FieldInfo {
  name: string
  schema: ZodSchema
  typeLabel: string
  required: boolean
  description?: string
}

export interface ResponseField {
  path: string
  typeLabel: string
  description?: string
}

export type ExampleValue =
  | string
  | number
  | boolean
  | null
  | ExampleValue[]
  | { [key: string]: ExampleValue }

function defOf(schema: ZodSchema | undefined | null): ZodDef | null {
  if (!schema) return null
  return (schema as ZodConcrete)._zod.def
}

function innerOf(def: ZodDef): ZodSchema | null {
  switch (def.type) {
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'catch':
    case 'readonly':
      return def.innerType
    default:
      return null
  }
}

function unwrap(schema: ZodSchema): ZodSchema {
  let current: ZodSchema = schema
  for (;;) {
    const def = defOf(current)
    if (!def) return current
    const inner = innerOf(def)
    if (!inner) return current
    current = inner
  }
}

export function describe(
  schema: ZodSchema | undefined | null
): string | undefined {
  if (!schema) return undefined
  const direct = globalRegistry.get(schema)?.description
  if (direct) return direct
  const def = defOf(schema)
  if (!def) return undefined
  const inner = innerOf(def)
  return inner ? describe(inner) : undefined
}

function literalLabel(value: LiteralValue): string {
  if (typeof value === 'bigint') return value.toString()
  if (value === undefined) return 'undefined'
  return JSON.stringify(value)
}

export function typeLabel(schema: ZodSchema | undefined | null): string {
  const def = defOf(schema)
  if (!def) return 'unknown'
  switch (def.type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'null':
    case 'undefined':
    case 'object':
      return def.type
    case 'bigint':
      return 'bigint'
    case 'date':
      return 'Date'
    case 'array': {
      const element = typeLabel(def.element)
      return element.includes(' | ') ? `(${element})[]` : `${element}[]`
    }
    case 'literal':
      return def.values.map(literalLabel).join(' | ')
    case 'enum':
      return Object.values(def.entries)
        .map(value => JSON.stringify(value))
        .join(' | ')
    case 'union':
      return def.options.map(option => objectShapeLabel(option)).join(' | ')
    case 'pipe': {
      const inLabel = typeLabel(def.in)
      return inLabel === 'transform' ? typeLabel(def.out) : inLabel
    }
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'catch':
    case 'readonly':
      return typeLabel(def.innerType)
    default:
      return def.type
  }
}

function objectShapeLabel(schema: ZodSchema): string {
  const def = defOf(schema)
  if (!def || def.type !== 'object') return typeLabel(schema)
  const fields = Object.entries(def.shape).map(([key, value]) => {
    const optional = defOf(value)?.type === 'optional' ? '?' : ''
    return `${key}${optional}: ${typeLabel(unwrap(value))}`
  })
  return `{ ${fields.join(', ')} }`
}

function typeLabelExtended(schema: ZodSchema): string {
  const def = defOf(schema)
  if (!def) return 'unknown'
  switch (def.type) {
    case 'nullable':
      return `${typeLabelExtended(def.innerType)} | null`
    case 'optional':
      return `${typeLabelExtended(def.innerType)} | undefined`
    case 'default':
    case 'prefault':
    case 'catch':
    case 'readonly':
      return typeLabelExtended(def.innerType)
    case 'record':
      return `Record<${typeLabel(def.keyType)}, ${objectShapeLabel(def.valueType)}>`
    default:
      return typeLabel(schema)
  }
}

function isRequired(field: ZodSchema): boolean {
  return !safeParse(field, undefined).success
}

export function walkObjectShape(
  schema: ZodSchema | undefined | null
): FieldInfo[] {
  const def = defOf(schema ? unwrap(schema) : null)
  if (!def || def.type !== 'object') return []
  return Object.entries(def.shape).map(([name, field]) => ({
    name,
    schema: field,
    typeLabel: typeLabel(unwrap(field)),
    required: isRequired(field),
    description: describe(field),
  }))
}

export function walkObjectSchema(
  schema: ZodSchema | undefined | null,
  prefix = ''
): FieldInfo[] {
  const base = schema ? unwrap(schema) : null
  const def = defOf(base)
  if (!def) return []

  if (def.type === 'array') {
    const elementBase = unwrap(def.element)
    if (defOf(elementBase)?.type === 'object') {
      return walkObjectSchema(def.element, prefix ? `${prefix}[]` : '')
    }
    return []
  }

  if (def.type !== 'object') return []

  return Object.entries(def.shape).flatMap(([name, field]) => {
    const path = prefix ? `${prefix}.${name}` : name
    const required = isRequired(field)
    const description = describe(field)
    const fieldBase = unwrap(field)
    const fieldDef = defOf(fieldBase)
    const arrayElement =
      fieldDef && fieldDef.type === 'array' ? fieldDef.element : null
    const elementIsObject =
      arrayElement !== null && defOf(unwrap(arrayElement))?.type === 'object'

    if (fieldDef?.type === 'object' || elementIsObject) {
      const children = walkObjectSchema(field, path)
      const row: FieldInfo = {
        name: path,
        schema: field,
        typeLabel: elementIsObject ? 'object[]' : 'object',
        required,
        description,
      }
      if (description) return [row, ...children]
      return children.length > 0 ? children : [row]
    }

    return [
      {
        name: path,
        schema: field,
        typeLabel: typeLabel(fieldBase),
        required,
        description,
      },
    ]
  })
}

export function walkResponseSchema(
  schema: ZodSchema | undefined | null,
  prefix = ''
): ResponseField[] {
  if (!schema) return []
  const def = defOf(schema)
  if (!def) return []

  const inner = innerOf(def)
  if (inner) {
    const innerDef = defOf(inner)
    const innerElement =
      innerDef && innerDef.type === 'array' ? innerDef.element : null
    if (
      innerDef?.type === 'object' ||
      (innerElement !== null && defOf(unwrap(innerElement))?.type === 'object')
    ) {
      return walkResponseSchema(inner, prefix)
    }
  }

  if (def.type === 'array') {
    const elementBase = unwrap(def.element)
    if (defOf(elementBase)?.type === 'object') {
      return walkResponseSchema(def.element, prefix ? `${prefix}[]` : '')
    }
    return [
      {
        path: prefix,
        typeLabel: typeLabelExtended(schema),
        description: describe(schema),
      },
    ]
  }

  if (def.type === 'object') {
    const rows = Object.entries(def.shape).flatMap(([name, field]) =>
      walkResponseSchema(field, prefix ? `${prefix}.${name}` : name)
    )
    const description = prefix ? describe(schema) : undefined
    if (description) {
      return [{ path: prefix, typeLabel: 'object', description }, ...rows]
    }
    return rows
  }

  return [
    {
      path: prefix,
      typeLabel: typeLabelExtended(schema),
      description: describe(schema),
    },
  ]
}

function kebab(name: string): string {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase()
}

export function toExampleValue(value: unknown): ExampleValue {
  if (value === null || value === undefined) return null
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (typeof value === 'bigint') return Number(value)
  if (Array.isArray(value)) return value.map(toExampleValue)
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, toExampleValue(inner)])
    )
  }
  return String(value)
}

export function generateExample(
  schema: ZodSchema | undefined | null,
  fieldName?: string
): ExampleValue {
  if (!schema) return null
  const registered = exampleRegistry.get(schema)
  if (registered) return toExampleValue(registered.value)

  const def = defOf(schema)
  if (!def) return null
  switch (def.type) {
    case 'string':
      return fieldName ? `<${kebab(fieldName)}>` : 'string'
    case 'number':
    case 'bigint':
      return 0
    case 'boolean':
      return false
    case 'null':
      return null
    case 'date':
      return '1970-01-01T00:00:00.000Z'
    case 'array':
      return [generateExample(def.element)]
    case 'object': {
      const out: { [key: string]: ExampleValue } = {}
      for (const [key, field] of Object.entries(def.shape)) {
        out[key] = generateExample(field, key)
      }
      return out
    }
    case 'literal': {
      const value = def.values[0]
      return value === undefined ? null : toExampleValue(value)
    }
    case 'enum': {
      const value = Object.values(def.entries)[0]
      return value === undefined ? null : toExampleValue(value)
    }
    case 'union': {
      const option = def.options[0]
      return option ? generateExample(option, fieldName) : null
    }
    case 'pipe':
      return generateExample(def.in, fieldName)
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'catch':
    case 'readonly':
      return generateExample(def.innerType, fieldName)
    default:
      return null
  }
}

export function dimPlaceholders(value: ExampleValue): ExampleValue {
  if (typeof value === 'string') {
    if (/<(dim|red|green)>/.test(value)) return value
    return value.startsWith('<') ? `<dim>${value}</dim>` : value
  }
  if (Array.isArray(value)) return value.map(dimPlaceholders)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, dimPlaceholders(inner)])
    )
  }
  return value
}
