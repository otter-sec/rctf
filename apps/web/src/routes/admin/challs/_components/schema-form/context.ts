import { getContext, setContext } from 'svelte'

const VALIDATION_KEY = Symbol('schema-form-validation')

export interface ValidationContext {
  registerError: (path: string, error: string | null) => void
  unregisterField: (path: string) => void
}

export function setValidationContext(ctx: ValidationContext) {
  setContext(VALIDATION_KEY, ctx)
}

export function getValidationContext(): ValidationContext | undefined {
  return getContext(VALIDATION_KEY)
}
