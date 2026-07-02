import type { QueryClient } from '@tanstack/svelte-query'
import { goto } from '$app/navigation'
import { clearToken } from '$lib/api'
import { queryKeys } from '$lib/query/keys'
import { toast } from '$lib/toast'

export function buildLoginUrl(teamToken: string): string {
  return `${window.location.origin}/login?token=${encodeURIComponent(teamToken)}`
}

export async function copyLoginUrl(teamToken: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(buildLoginUrl(teamToken))
    toast.success('Login URL copied to clipboard!')
  } catch {
    toast.error('Failed to copy login URL')
  }
}

export function logout(queryClient: QueryClient): void {
  clearToken()
  queryClient.setQueryData(queryKeys.userSelf, null)
  goto('/login')
}
