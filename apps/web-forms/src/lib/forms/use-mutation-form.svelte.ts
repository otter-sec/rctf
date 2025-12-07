import type {
  AnyRouteDefinition,
  RouteBodyInput,
  RouteResponse,
} from '@rctf/types'
import { apiRequest, type InlineArgs } from '$lib/api'
import type { FieldValidators, FormErrors, FormTouched } from './types'

type SuccessKind = `good${string}`

type ExtractSuccessResponse<TRoute extends AnyRouteDefinition> = Extract<
  RouteResponse<TRoute>,
  { kind: SuccessKind }
>

type ExtractErrorResponse<TRoute extends AnyRouteDefinition> = Exclude<
  RouteResponse<TRoute>,
  { kind: SuccessKind }
>

export interface MutationFormConfig<
  TRoute extends AnyRouteDefinition,
  TFields extends Record<string, unknown> = NonNullable<RouteBodyInput<TRoute>>,
> {
  route: TRoute
  initial: TFields
  validators?: FieldValidators<TFields>
  fieldMapping?: Record<string, keyof TFields>
  transform?: (values: TFields) => InlineArgs<TRoute>
  onSuccess?: (response: ExtractSuccessResponse<TRoute>) => void
  onError?: (response: ExtractErrorResponse<TRoute>) => void
}

export function useMutationForm<
  TRoute extends AnyRouteDefinition,
  TFields extends Record<string, unknown> = NonNullable<RouteBodyInput<TRoute>>,
>(config: MutationFormConfig<TRoute, TFields>) {
  const initialSnapshot = JSON.stringify(config.initial)

  let values = $state<TFields>({ ...config.initial })
  let errors = $state<FormErrors<TFields>>({})
  let touched = $state<FormTouched<TFields>>({})
  let isPending = $state(false)

  const isDirty = $derived(JSON.stringify(values) !== initialSnapshot)

  const isValid = $derived(() => {
    for (const key in errors) {
      if (errors[key]) return false
    }
    return true
  })

  function setValue<K extends keyof TFields>(field: K, value: TFields[K]) {
    values[field] = value
    if (config.validators?.[field]) {
      errors[field] = config.validators[field]!(value)
    }
  }

  function setError<K extends keyof TFields>(field: K, error: string | null) {
    errors[field] = error
  }

  function setTouched<K extends keyof TFields>(field: K, isTouched = true) {
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

    const keys = Object.keys(config.initial) as (keyof TFields)[]
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
  }

  async function submit(extraArgs?: Partial<InlineArgs<TRoute>>) {
    if (!validate()) return

    const args = config.transform
      ? config.transform(values)
      : ({ ...values, ...extraArgs } as InlineArgs<TRoute>)

    isPending = true
    try {
      const response = await apiRequest(config.route, args)
      if (response.kind.startsWith('good')) {
        config.onSuccess?.(response as ExtractSuccessResponse<TRoute>)
      } else {
        setServerError(response)
        config.onError?.(response as ExtractErrorResponse<TRoute>)
      }
    } catch (error) {
      const keys = Object.keys(config.initial) as (keyof TFields)[]
      if (keys.length > 0) {
        errors[keys[0]] = error instanceof Error ? error.message : 'An error occurred'
      }
    } finally {
      isPending = false
    }
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    submit()
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
      return isValid()
    },
    get isPending() {
      return isPending
    },
    setValue,
    setError,
    setTouched,
    setServerError,
    validate,
    reset,
    submit,
    handleSubmit,
  }
}
