import { registry, type ZodMiniType } from 'zod/mini'

export const exampleRegistry = registry<{ value: unknown }>()
export function example<T extends ZodMiniType<any, any>>(
  schema: T,
  value: unknown
): T {
  exampleRegistry.add(schema, { value })
  return schema
}
