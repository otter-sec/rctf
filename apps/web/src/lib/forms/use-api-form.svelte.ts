import type {
  AnyRouteDefinition,
  ResponseDefinition,
  RouteErrorResponse,
  RouteSuccessResponse,
} from '@rctf/types'
import { apiRequest, type InlineArgs } from '$lib/api'
import { flattenError, type core } from 'zod/mini'

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
    Object.assign(data, values)
  }

  function clearErrors() {
    errors = {}
  }

  function setError(field: keyof Data | '_form', message: string | null) {
    if (message) {
      errors[field] = message
    } else {
      delete errors[field]
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
    const fieldIssue = zodError.issues.find(issue => issue.path[0] === field)

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

    const { formErrors, fieldErrors } = flattenError(
      result.error as core.$ZodError<Data>
    )
    const nextErrors: FormErrors<Data> = {}
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const first = (messages as string[] | undefined)?.[0]
      if (first) nextErrors[field as keyof Data] = first
    }
    if (formErrors.length > 0) nextErrors._form = formErrors.join('\n')
    errors = nextErrors
    return false
  }

  function isSuccessKind(kind: string): boolean {
    const goodResponses: readonly ResponseDefinition[] = route.goodResponses
    return goodResponses.some(definition => definition.kind === kind)
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

      if (isSuccessKind(response.kind)) {
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
