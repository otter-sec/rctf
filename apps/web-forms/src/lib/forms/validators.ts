import { z } from 'zod'
import type { Validator } from './types'

export const required: Validator<string> = (value: string) =>
  value.trim() ? null : 'Required'

export function compose<T>(...validators: Validator<T>[]): Validator<T> {
  return (value: T) => {
    for (const validator of validators) {
      const error = validator(value)
      if (error) return error
    }
    return null
  }
}

export function zodValidator<T>(schema: z.ZodType<T>): Validator<T> {
  return (value: T) => {
    const result = schema.safeParse(value)
    if (result.success) return null
    return result.error.errors[0]?.message ?? 'Invalid'
  }
}
