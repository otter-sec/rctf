import type { FieldValidators, Form, FormErrors, FormTouched } from './types'

export interface CreateFormConfig<T extends Record<string, unknown>> {
  initial: T
  validators?: FieldValidators<T>
  fieldMapping?: Record<string, keyof T>
}

export function createForm<T extends Record<string, unknown>>(
  config: CreateFormConfig<T>
): Form<T> {
  const initialSnapshot = JSON.stringify(config.initial)

  let values = $state<T>({ ...config.initial })
  let errors = $state<FormErrors<T>>({})
  let touched = $state<FormTouched<T>>({})
  let isSubmitting = $state(false)

  const isDirty = $derived(JSON.stringify(values) !== initialSnapshot)

  const isValid = $derived.by(() => {
    for (const key in errors) {
      if (errors[key]) return false
    }
    return true
  })

  function setValue<K extends keyof T>(field: K, value: T[K]) {
    values[field] = value
    if (config.validators?.[field]) {
      errors[field] = config.validators[field]!(value)
    }
  }

  function setError<K extends keyof T>(field: K, error: string | null) {
    errors[field] = error
  }

  function setTouched<K extends keyof T>(field: K, isTouched = true) {
    touched[field] = isTouched
  }

  function setServerError(response: { message: string }) {
    const msg = response.message.toLowerCase()
    const mapping = config.fieldMapping ?? {}

    for (const [keyword, field] of Object.entries(mapping)) {
      if (msg.includes(keyword.toLowerCase())) {
        errors[field] = response.message
        return
      }
    }

    const keys = Object.keys(config.initial) as (keyof T)[]
    for (const key of keys) {
      if (msg.includes(String(key).toLowerCase())) {
        errors[key] = response.message
        return
      }
    }

    if (keys.length > 0) {
      errors[keys[0]] = response.message
    }
  }

  function validate(): boolean {
    let valid = true
    for (const key in config.initial) {
      const validator = config.validators?.[key]
      if (validator) {
        const error = validator(values[key])
        errors[key] = error
        if (error) valid = false
      }
    }
    return valid
  }

  function reset() {
    values = { ...config.initial }
    errors = {}
    touched = {}
    isSubmitting = false
  }

  function setSubmitting(submitting: boolean) {
    isSubmitting = submitting
  }

  return {
    get values() {
      return values
    },
    get errors() {
      return errors
    },
    get touched() {
      return touched
    },
    get isDirty() {
      return isDirty
    },
    get isValid() {
      return isValid
    },
    get isSubmitting() {
      return isSubmitting
    },
    setValue,
    setError,
    setTouched,
    setServerError,
    validate,
    reset,
    setSubmitting,
  }
}
