import { z } from 'zod/mini'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type StatusCode = number
export type SchemaLike = z.ZodMiniType<any, any>
