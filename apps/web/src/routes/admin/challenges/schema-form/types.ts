import { getContext } from 'svelte'

export interface JsonSchema {
  $ref?: string
  $defs?: Record<string, JsonSchema>
  definitions?: Record<string, JsonSchema>
  type?: string | string[]
  title?: string
  description?: string
  default?: unknown
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  enum?: unknown[]
  const?: unknown
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  multipleOf?: number
  minLength?: number
  maxLength?: number
  minItems?: number
  maxItems?: number
  pattern?: string
  format?: string
  additionalProperties?: boolean | JsonSchema
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  allOf?: JsonSchema[]
  nullable?: boolean
  propertyNames?: JsonSchema
}

export interface FieldProps {
  schema: JsonSchema
  value: unknown
  path: string[]
  onChange: (path: string[], value: unknown) => void
  onSelect?: (path: string[]) => void
  disabled?: boolean
  required?: boolean
}

export type FindingSeverity = 'missing' | 'invalid'

export type PathStatus = 'invalid' | 'incomplete'

export interface SchemaFormFieldError {
  severity: FindingSeverity
  message: string
}

export interface SchemaFormFieldErrorDisplay {
  error: string | null
  incomplete: boolean
}

export interface SchemaFormErrorsContext {
  get: (path: string[]) => SchemaFormFieldError | null
  status: (path: string[]) => PathStatus | undefined
  display: (path: string[]) => SchemaFormFieldErrorDisplay
}

export const NO_FIELD_ERROR: SchemaFormFieldErrorDisplay = {
  error: null,
  incomplete: false,
}

export const SCHEMA_FORM_ERRORS_KEY = 'schema-form-errors'

export function getSchemaFormErrors(): SchemaFormErrorsContext | undefined {
  return getContext<SchemaFormErrorsContext | undefined>(SCHEMA_FORM_ERRORS_KEY)
}
