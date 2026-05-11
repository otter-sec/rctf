import {
  CreateUserTokenRouteV2,
  CtftimeCallbackRoute,
  GetVerifyInfoRouteV2,
  GoodVerifyInfo,
  LoginRoute,
  RecoverRouteV2,
  RegisterRouteV2,
  VerifyRoute,
} from '@rctf/types'
import { createQuery, queryOptions } from '@tanstack/svelte-query'
import { apiRequest } from '$lib/api'
import { ApiError, createApiMutation } from './core'

export const verifyInfoQueryOptions = (token: string | null) =>
  queryOptions({
    queryKey: ['auth', 'verify-info', token] as const,
    queryFn: async () => {
      if (!token) return null
      const response = await apiRequest(GetVerifyInfoRouteV2, { token })
      if (response.kind === GoodVerifyInfo.kind) {
        return response.data
      }
      throw new ApiError(response.kind, response.message)
    },
    enabled: !!token,
    staleTime: Infinity,
  })

export function useVerifyInfo(token: () => string | null) {
  return createQuery(() => verifyInfoQueryOptions(token()))
}

export function useLoginMutation() {
  return createApiMutation(LoginRoute)
}

export function useRegisterMutation() {
  return createApiMutation(RegisterRouteV2)
}

export function useVerifyMutation() {
  return createApiMutation(VerifyRoute)
}

export function useRecoverMutation() {
  return createApiMutation(RecoverRouteV2)
}

export function useCtftimeCallbackMutation() {
  return createApiMutation(CtftimeCallbackRoute)
}

export function useCreateUserTokenMutation() {
  return createApiMutation(CreateUserTokenRouteV2)
}
