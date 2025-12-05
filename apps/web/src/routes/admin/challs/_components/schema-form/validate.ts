import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { JsonSchema } from './types'

const ajv = new Ajv({ allErrors: true, messages: true })
addFormats(ajv)

export interface ValidationResult {
  valid: boolean
  error: string | null
}

export function validateValue(
  schema: JsonSchema,
  value: unknown
): ValidationResult {
  if (value === undefined) {
    return { valid: true, error: null }
  }

  const validate = ajv.compile(schema)
  const valid = validate(value)

  if (valid) {
    return { valid: true, error: null }
  }

  const error = validate.errors?.[0]
  if (!error) {
    return { valid: false, error: 'Invalid value' }
  }

  return { valid: false, error: formatError(error, schema) }
}

function formatError(
  error: { keyword: string; params: Record<string, unknown>; message?: string },
  schema: JsonSchema
): string {
  switch (error.keyword) {
    case 'type':
      if (error.params.type === 'integer') {
        return 'Must be a whole number'
      }
      return `Must be a ${error.params.type}`
    case 'minimum':
      return `Must be at least ${error.params.limit}`
    case 'maximum':
      return `Must be at most ${error.params.limit}`
    case 'minLength':
      if (error.params.limit === 1) return 'Cannot be empty'
      return `Must be at least ${error.params.limit} characters`
    case 'maxLength':
      return `Must be at most ${error.params.limit} characters`
    case 'pattern':
      return schema.title
        ? `Invalid ${schema.title.toLowerCase()}`
        : 'Invalid format'
    case 'format':
      return `Must be a valid ${error.params.format}`
    case 'enum':
      return 'Must be one of the allowed values'
    default:
      return error.message ?? 'Invalid value'
  }
}
