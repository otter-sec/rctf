import type { JsonSchema } from './types'

export interface ValidationResult {
  valid: boolean
  error: string | null
}

const SUPPORTED_VALIDATION_KEYWORDS = new Set([
  'nullable',
  'anyOf',
  'oneOf',
  'type',
  'minLength',
  'maxLength',
  'pattern',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'multipleOf',
  'enum',
])

const METADATA_KEYWORDS = new Set([
  'title',
  'description',
  'default',
  'format',
  '$schema',
  '$id',
  '$defs',
  'definitions',
])

const ALL_SUPPORTED_KEYWORDS = new Set([
  ...SUPPORTED_VALIDATION_KEYWORDS,
  ...METADATA_KEYWORDS,
])

function checkUnsupportedKeywords(schema: JsonSchema): void {
  const unsupported: string[] = []
  for (const key of Object.keys(schema)) {
    if (!ALL_SUPPORTED_KEYWORDS.has(key)) {
      unsupported.push(key)
    }
  }
  if (unsupported.length > 0) {
    throw new Error(
      `Unsupported JSON Schema keywords: ${unsupported.join(', ')}`
    )
  }
}

export function schemaAllowsNull(schema: JsonSchema): boolean {
  if (schema.nullable) return true

  const types = Array.isArray(schema.type)
    ? schema.type
    : schema.type
      ? [schema.type]
      : null
  if (types && !types.includes('null')) return false
  if (schema.enum && !schema.enum.includes(null)) return false
  if ('const' in schema && schema.const !== null) return false
  if (schema.anyOf && !schema.anyOf.some(schemaAllowsNull)) return false
  if (schema.oneOf && schema.oneOf.filter(schemaAllowsNull).length !== 1) {
    return false
  }

  return true
}

function isMultipleOf(value: number, multiple: number): boolean {
  if (!Number.isFinite(multiple) || multiple <= 0) return false
  const quotient = value / multiple
  const nearestInteger = Math.round(quotient)
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(quotient)) * 4
  return Math.abs(quotient - nearestInteger) <= tolerance
}

export function validateValue(
  schema: JsonSchema,
  value: unknown
): ValidationResult {
  checkUnsupportedKeywords(schema)
  if (value === undefined) {
    return { valid: true, error: null }
  }
  if (value === null) {
    if (schemaAllowsNull(schema)) return { valid: true, error: null }
    const typeError = schema.type ? validateType(schema.type, value) : null
    return { valid: false, error: typeError ?? 'Must not be null' }
  }

  if (schema.anyOf) {
    for (const subSchema of schema.anyOf) {
      const result = validateValue(subSchema, value)
      if (result.valid) return result
    }
    return { valid: false, error: 'Does not match any allowed type' }
  }

  if (schema.oneOf) {
    let matchCount = 0
    for (const subSchema of schema.oneOf) {
      const result = validateValue(subSchema, value)
      if (result.valid) matchCount++
    }
    if (matchCount === 1) return { valid: true, error: null }
    if (matchCount === 0)
      return { valid: false, error: 'Does not match any allowed type' }
    return {
      valid: false,
      error: 'Matches multiple types (should match exactly one)',
    }
  }

  const schemaType = schema.type
  if (schemaType) {
    const typeError = validateType(schemaType, value)
    if (typeError) return { valid: false, error: typeError }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      if (schema.minLength === 1)
        return { valid: false, error: 'Cannot be empty' }
      return {
        valid: false,
        error: `Must be at least ${schema.minLength} characters`,
      }
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      return {
        valid: false,
        error: `Must be at most ${schema.maxLength} characters`,
      }
    }
    if (schema.pattern) {
      try {
        const regex = new RegExp(schema.pattern)
        if (!regex.test(value)) {
          return {
            valid: false,
            error: schema.title
              ? `Invalid ${schema.title.toLowerCase()}`
              : 'Invalid format',
          }
        }
      } catch {}
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      return { valid: false, error: `Must be at least ${schema.minimum}` }
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      return { valid: false, error: `Must be at most ${schema.maximum}` }
    }
    if (
      schema.exclusiveMinimum !== undefined &&
      value <= schema.exclusiveMinimum
    ) {
      return {
        valid: false,
        error: `Must be greater than ${schema.exclusiveMinimum}`,
      }
    }
    if (
      schema.multipleOf !== undefined &&
      !isMultipleOf(value, schema.multipleOf)
    ) {
      return {
        valid: false,
        error: `Must be a multiple of ${schema.multipleOf}`,
      }
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    return { valid: false, error: 'Must be one of the allowed values' }
  }

  return { valid: true, error: null }
}

function validateType(type: string | string[], value: unknown): string | null {
  const types = Array.isArray(type) ? type : [type]

  for (const t of types) {
    switch (t) {
      case 'string':
        if (typeof value === 'string') return null
        break
      case 'number':
        if (typeof value === 'number' && !isNaN(value)) return null
        break
      case 'integer':
        if (typeof value === 'number' && Number.isInteger(value)) return null
        break
      case 'boolean':
        if (typeof value === 'boolean') return null
        break
      case 'array':
        if (Array.isArray(value)) return null
        break
      case 'object':
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        )
          return null
        break
      case 'null':
        if (value === null) return null
        break
    }
  }

  if (types.length === 1) {
    const t = types[0]
    if (t === 'integer') return 'Must be a whole number'
    return `Must be a ${t}`
  }
  return `Must be one of: ${types.join(', ')}`
}
