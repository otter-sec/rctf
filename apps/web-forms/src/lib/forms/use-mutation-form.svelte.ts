import type {
  AnyRouteDefinition,
  RouteBodyInput,
  RouteErrorResponse,
  RouteSuccessResponse,
} from '@rctf/types'
import { apiRequest, type InlineArgs } from '$lib/api'
import { z } from 'zod'
import type { FieldValidators, FormErrors, FormTouched } from './types'

function unwrapZodSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodEffects) {
    return unwrapZodSchema(schema._def.schema)
  }
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return schema
  }
  return schema
}

function getFieldSchema(
  bodySchema: z.ZodTypeAny | undefined,
  field: string
): z.ZodTypeAny | undefined {
  if (!bodySchema) return undefined

  const unwrapped = unwrapZodSchema(bodySchema)
  if (unwrapped instanceof z.ZodObject) {
    return unwrapped.shape[field]
  }

  return undefined
}

function validateWithSchema(
  schema: z.ZodTypeAny | undefined,
  value: unknown
): string | null {
  if (!schema) return null

  const result = schema.safeParse(value)
  if (result.success) return null

  return result.error.errors[0]?.message ?? 'Invalid'
}

export interface MutationFormConfig<
  TRoute extends AnyRouteDefinition,
  TFields extends Record<string, unknown> = NonNullable<RouteBodyInput<TRoute>>,
> {
  route: TRoute
  initial: TFields
  validators?: FieldValidators<TFields>
  fieldMapping?: Record<string, keyof TFields>
  transform?: (values: TFields) => InlineArgs<TRoute>
  onSuccess?: (response: RouteSuccessResponse<TRoute>) => void
  onError?: (response: RouteErrorResponse<TRoute>) => void
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

  const isValid = $derived.by(() => {
    for (const key in errors) {
      if (errors[key]) return false
    }
    return true
  })

  function setValue<K extends keyof TFields>(field: K, value: TFields[K]) {
    values[field] = value
    errors[field] = validateField(field, value)
  }

  function validateField<K extends keyof TFields>(
    field: K,
    value: TFields[K]
  ): string | null {
    if (config.validators?.[field]) {
      return config.validators[field]!(value)
    }
    const fieldSchema = getFieldSchema(config.route.body, String(field))
    return validateWithSchema(fieldSchema, value)
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
      const error = validateField(key as keyof TFields, values[key])
      errors[key] = error
      if (error) valid = false
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
        config.onSuccess?.(response as RouteSuccessResponse<TRoute>)
      } else {
        setServerError(response)
        config.onError?.(response as RouteErrorResponse<TRoute>)
      }
    } catch (error) {
      const keys = Object.keys(config.initial) as (keyof TFields)[]
      if (keys.length > 0) {
        errors[keys[0]] =
          error instanceof Error ? error.message : 'An error occurred'
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
      return isValid
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
