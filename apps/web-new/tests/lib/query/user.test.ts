import { GoodMemberData, GoodUserDataV2 } from '@rctf/types'
import { hashKey } from '@tanstack/svelte-query'
import { queryKeys } from '$lib/query/keys'
import { beforeAll, describe, expect, mock, test } from 'bun:test'

mock.module('$app/environment', () => ({ browser: false }))

let apiResponse: unknown = null
mock.module('$lib/api', () => ({
  apiRequest: async () => apiResponse,
  isAuthenticated: () => true,
}))

let user!: typeof import('$lib/query/user')

beforeAll(async () => {
  user = await import('$lib/query/user')
})

function runQueryFn<T>(options: { queryFn?: unknown }): Promise<T> {
  const fn = options.queryFn
  if (typeof fn !== 'function') {
    throw new Error('expected a callable queryFn')
  }
  return fn(undefined) as Promise<T>
}

describe('userByIdQueryOptions', () => {
  test('distinct users produce distinct cache keys', () => {
    const keys = ['team-a', 'team-b', 'team-c'].map(id =>
      hashKey(queryKeys.userById(id))
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('returns the data on a good response', async () => {
    apiResponse = { kind: GoodUserDataV2.kind, data: { id: 'team-a' } }
    const result = await runQueryFn(user.userByIdQueryOptions('team-a'))
    expect(result).toEqual({ id: 'team-a' })
  })

  test('throws on a bad response', async () => {
    apiResponse = { kind: 'badUnknownUser', message: 'No such user.' }
    await expect(
      runQueryFn(user.userByIdQueryOptions('team-a'))
    ).rejects.toThrow('No such user.')
  })
})

describe('membersQueryOptions', () => {
  test('disabled when the userMembers config flag is off', () => {
    expect(user.membersQueryOptions(false).enabled).toBe(false)
  })

  test('enabled when the userMembers config flag is on', () => {
    expect(user.membersQueryOptions(true).enabled).toBe(true)
  })

  test('returns the member list on a good response', async () => {
    const members = [{ id: 'm1', userid: 'u1', email: 'a@b.co' }]
    apiResponse = { kind: GoodMemberData.kind, data: members }
    const result = await runQueryFn(user.membersQueryOptions(true))
    expect(result).toEqual(members)
  })
})
