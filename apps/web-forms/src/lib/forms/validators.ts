import {
  validateEmail as _validateEmail,
  validateName as _validateName,
} from '@rctf/types'
import type { Validator } from './types'

export const required: Validator<string> = (value: string) =>
  value.trim() ? null : 'Required'

export const email: Validator<string> = (value: string) =>
  !value || _validateEmail(value) ? null : 'Invalid email'

export const name: Validator<string> = (value: string) =>
  !value || _validateName(value) ? null : 'Name must be 2-64 printable characters'

export const minLength =
  (n: number): Validator<string> =>
  (value: string) =>
    value.length >= n ? null : `Must be at least ${n} characters`

export const maxLength =
  (n: number): Validator<string> =>
  (value: string) =>
    value.length <= n ? null : `Must be at most ${n} characters`

export const min =
  (n: number): Validator<number> =>
  (value: number) =>
    value >= n ? null : `Must be at least ${n}`

export const max =
  (n: number): Validator<number> =>
  (value: number) =>
    value <= n ? null : `Must be at most ${n}`

export function compose<T>(...validators: Validator<T>[]): Validator<T> {
  return (value: T) => {
    for (const validator of validators) {
      const error = validator(value)
      if (error) return error
    }
    return null
  }
}
