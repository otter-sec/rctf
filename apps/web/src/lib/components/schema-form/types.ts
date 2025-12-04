export interface JsonSchema {
  $ref?: string
  $defs?: Record<string, JsonSchema>
  definitions?: Record<string, JsonSchema>
  type?: string
  title?: string
  description?: string
  default?: unknown
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  enum?: unknown[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  additionalProperties?: boolean | JsonSchema
}

export interface SchemaFormContext {
  schema: JsonSchema
  value: unknown
  path: string[]
  onChange: (path: string[], value: unknown) => void
  disabled: boolean
}
