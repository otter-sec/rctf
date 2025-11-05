import { z } from 'zod'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type StatusCode = number

export type SchemaLike = z.ZodTypeAny
