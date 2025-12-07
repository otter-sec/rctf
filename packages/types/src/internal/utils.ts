import { z } from 'zod/mini'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type StatusCode = number
export type Schema = z.ZodMiniType<any, any>
export type Infer<T> = T extends Schema ? z.output<T> : undefined
export type InferInput<T> = T extends Schema ? z.input<T> : undefined
