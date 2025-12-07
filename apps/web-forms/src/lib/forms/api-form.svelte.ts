import type {
  AnyRouteDefinition,
  RouteBodyInput,
  RouteErrorResponse,
  RouteSuccessResponse,
} from '@rctf/types'
import { createForm } from '@tanstack/svelte-form'
import { apiRequest, type InlineArgs } from '$lib/api'

export interface ApiFormConfig<
  TRoute extends AnyRouteDefinition,
  TFields extends Record<string, unknown> = NonNullable<RouteBodyInput<TRoute>>,
> {
  route: TRoute
  defaultValues: TFields
  transform?: (values: TFields) => InlineArgs<TRoute>
  onSuccess?: (response: RouteSuccessResponse<TRoute>) => void
  onError?: (response: RouteErrorResponse<TRoute>) => void
}

export function createApiForm<
  TRoute extends AnyRouteDefinition,
  TFields extends Record<string, unknown> = NonNullable<RouteBodyInput<TRoute>>,
>(config: ApiFormConfig<TRoute, TFields>) {
  return createForm(() => ({
    defaultValues: config.defaultValues,
    validators: {
      onSubmit: config.route.body,
    },
    onSubmit: async ({ value, formApi }) => {
      const args = config.transform
        ? config.transform(value as TFields)
        : (value as unknown as InlineArgs<TRoute>)

      const response = await apiRequest(config.route, args)

      if (response.kind.startsWith('good')) {
        config.onSuccess?.(response as RouteSuccessResponse<TRoute>)
      } else {
        formApi.setErrorMap({ onSubmit: response.message as never })
        config.onError?.(response as RouteErrorResponse<TRoute>)
      }
    },
  }))
}

export { createForm } from '@tanstack/svelte-form'
