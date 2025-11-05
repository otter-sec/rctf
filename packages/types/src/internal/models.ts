import { z } from 'zod'
import type { SchemaLike } from './utils'

export interface ModelOptions {
  description?: string
}

export const createModel = <TSchema extends SchemaLike>(
  name: string,
  schema: TSchema,
  options?: ModelOptions
): TSchema => schema.describe(options?.description ?? name)

export const model = <TShape extends z.ZodRawShape>(
  name: string,
  shape: TShape,
  options?: ModelOptions
) => createModel(name, z.object(shape), options)
