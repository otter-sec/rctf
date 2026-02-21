import type {
  AnyRouteDefinition,
  RouteErrorResponse,
  RouteSuccessResponse,
} from '@rctf/types'
import { apiRequest, type InlineArgs } from '$lib/api'
import { prettifyError, type core } from 'zod/mini'

type FormErrors<T> = Partial<Record<keyof T | '_form', string>>

export interface UseApiFormConfig<TRoute extends AnyRouteDefinition> {
  defaults?: Partial<InlineArgs<TRoute>>
  onSuccess?: (response: RouteSuccessResponse<TRoute>) => void
  onError?: (response: RouteErrorResponse<TRoute>) => void
}

export function useApiForm<TRoute extends AnyRouteDefinition>(
  route: TRoute,
  config: UseApiFormConfig<TRoute> = {}
) {
  type Data = InlineArgs<TRoute>
  const initialData = (config.defaults ?? {}) as Data

  let data = $state<Data>({ ...initialData })
  let errors = $state<FormErrors<Data>>({})
  let submitting = $state(false)

  function reset() {
    data = { ...initialData }
    errors = {}
  }

  function setData(values: Partial<Data>) {
    data = { ...data, ...values }
  }

  function clearErrors() {
    errors = {}
  }

  function setError(field: keyof Data | '_form', message: string | null) {
    if (message) {
      errors = { ...errors, [field]: message }
    } else {
      const newErrors = { ...errors }
      delete newErrors[field]
      errors = newErrors
    }
  }

  function validateField(field: keyof Data): string | null {
    if (!route.body) return null

    const result = route.body.safeParse(data)
    if (result.success) {
      setError(field, null)
      return null
    }

    const zodError = result.error as core.$ZodError
    const fieldIssue = zodError.issues.find(issue => issue.path?.[0] === field)

    if (fieldIssue) {
      setError(field, fieldIssue.message)
      return fieldIssue.message
    }

    setError(field, null)
    return null
  }

  function validateAll(): boolean {
    if (!route.body) return true

    const result = route.body.safeParse(data)
    if (result.success) {
      errors = {}
      return true
    }

    errors = { _form: prettifyError(result.error) } as FormErrors<Data>
    return false
  }

  async function submit(e?: Event) {
    e?.preventDefault()
    e?.stopPropagation()

    if (submitting) return
    errors = {}

    if (!validateAll()) return

    submitting = true

    try {
      const response = await apiRequest(route, data)

      if (response.kind.startsWith('good')) {
        config.onSuccess?.(response as RouteSuccessResponse<TRoute>)
      } else {
        errors = { _form: response.message } as FormErrors<Data>
        config.onError?.(response as RouteErrorResponse<TRoute>)
      }
    } catch (err) {
      errors = {
        _form: err instanceof Error ? err.message : 'An error occurred',
      } as FormErrors<Data>
    } finally {
      submitting = false
    }
  }

  return {
    get data() {
      return data
    },
    set data(v: Data) {
      data = v
    },
    get errors() {
      return errors
    },
    get submitting() {
      return submitting
    },
    submit,
    reset,
    setData,
    setError,
    clearErrors,
    validateField,
  }
}
