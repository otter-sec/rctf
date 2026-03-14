import {
  CreateMemberRoute,
  DeleteCtftimeRoute,
  DeleteEmailRoute,
  DeleteMemberRoute,
  GetMembersRoute,
  GoodMemberData,
  SetCtftimeRoute,
  SetEmailRouteV2,
  UpdateAvatarRoute,
  UpdateUserRouteV2,
} from '@rctf/types'
import { createQuery, queryOptions } from '@tanstack/svelte-query'
import { apiRequest } from '$lib/api'
import { ApiError, createApiMutation } from './core'

export const membersQueryOptions = queryOptions({
  queryKey: ['members'] as const,
  queryFn: async () => {
    const response = await apiRequest(GetMembersRoute)
    if (response.kind === GoodMemberData.kind) {
      return response.data
    }
    throw new ApiError(response.kind, response.message)
  },
})

export function useMembers() {
  return createQuery(() => membersQueryOptions)
}

export function useUpdateUserMutation() {
  return createApiMutation(UpdateUserRouteV2)
}

export function useSetEmailMutation() {
  return createApiMutation(SetEmailRouteV2)
}

export function useDeleteEmailMutation() {
  return createApiMutation(DeleteEmailRoute)
}

export function useSetCtftimeMutation() {
  return createApiMutation(SetCtftimeRoute)
}

export function useDeleteCtftimeMutation() {
  return createApiMutation(DeleteCtftimeRoute)
}

export function useCreateMemberMutation() {
  return createApiMutation(CreateMemberRoute)
}

export function useDeleteMemberMutation() {
  return createApiMutation(DeleteMemberRoute)
}

export function useUpdateAvatarMutation() {
  return createApiMutation(UpdateAvatarRoute)
}
