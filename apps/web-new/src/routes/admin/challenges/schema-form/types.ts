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

/**
 * Leaf fields report validation state up to the root by dotted path key. The
 * root keeps the map; a null error clears the entry. This replaces the old
 * Svelte-context registry with an explicit callback prop.
 */
export type ErrorReporter = (pathKey: string, error: string | null) => void

export interface FieldProps {
  schema: JsonSchema
  value: unknown
  path: string[]
  onChange: (path: string[], value: unknown) => void
  onError?: ErrorReporter
  disabled?: boolean
  required?: boolean
}
