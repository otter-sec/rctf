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

export interface SchemaFormContext {
  schema: JsonSchema
  value: unknown
  path: string[]
  onChange: (path: string[], value: unknown) => void
  disabled: boolean
}

export interface FieldProps {
  schema: JsonSchema
  value: unknown
  path: string[]
  onChange: (path: string[], value: unknown) => void
  disabled?: boolean
  required?: boolean
}
