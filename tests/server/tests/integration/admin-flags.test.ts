import { config } from '@rctf/config'
import { challenges, createDatabase } from '@rctf/db'
import {
  BadBody,
  GoodAdminChallenge,
  GoodAdminChallengeV2,
  GoodChallengeUpdate,
  GoodChallengeUpdateV2,
  GoodFlagProviders,
  Permissions,
} from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>
let adminToken: string
const getDb = () => createDatabase(config.database.sql).db

const createdUserCleanups: Array<() => Promise<void>> = []
const createdChallengeIds: string[] = []

const trackChallenge = (id: string): string => {
  createdChallengeIds.push(id)
  return id
}

const adminRequest = async (
  path: string,
  init: { method?: string; body?: unknown } = {}
) => {
  return await request(app, path, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  })
}

beforeAll(async () => {
  app = await getApp()
  const adminPerms = Permissions.challsRead | Permissions.challsWrite
  const { user, cleanup } = await generateRealTestUser(adminPerms)
  createdUserCleanups.push(cleanup)
  adminToken = await generateAuthToken(user.id)
})

afterAll(async () => {
  const db = getDb()
  for (const id of createdChallengeIds) {
    await db.delete(challenges).where(eq(challenges.id, id))
  }
  for (const cleanup of createdUserCleanups) {
    await cleanup()
  }
})

const baseData = {
  name: 'Flags Test',
  description: 'multi-flag admin test',
  category: 'misc',
  author: 'tester',
  points: { min: 100, max: 500 },
}

describe('admin flag providers', () => {
  test('lists the available providers with their config schemas', async () => {
    const body = await expectResponse(
      await adminRequest('/api/v2/admin/flags/providers'),
      GoodFlagProviders
    )
    expect(body.data.defaultProvider).toBe('flags/static')

    const names = body.data.providers.map(p => p.name)
    expect(names).toContain('flags/static')

    const staticProvider = body.data.providers.find(
      p => p.name === 'flags/static'
    )!
    expect(staticProvider.schema.type).toBe('object')
    expect(staticProvider.schema.required).toEqual(['flag'])
  })
})

describe('admin flag entries', () => {
  test('v2 flags round-trip through update and get', async () => {
    const id = trackChallenge(crypto.randomUUID())
    const flags = [
      { provider: 'flags/static', config: { flag: 'flag{one}' } },
      { provider: 'flags/static', config: { flag: 'flag{two}' } },
    ]

    const putRes = await adminRequest(`/api/v2/admin/challs/${id}`, {
      method: 'PUT',
      body: { data: { ...baseData, flags } },
    })
    const putBody = await expectResponse(putRes, GoodChallengeUpdateV2)
    expect(putBody.data.flags).toEqual(flags)

    const getRes = await adminRequest(`/api/v2/admin/challs/${id}`)
    const getBody = await expectResponse(getRes, GoodAdminChallengeV2)
    expect(getBody.data.flags).toEqual(flags)
  })

  test('v2 defaults an omitted provider to flags/static', async () => {
    const id = trackChallenge(crypto.randomUUID())

    const putBody = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: {
          data: {
            ...baseData,
            flags: [{ config: { flag: 'flag{implicit}' } }],
          },
        },
      }),
      GoodChallengeUpdateV2
    )
    expect(putBody.data.flags).toEqual([
      { provider: 'flags/static', config: { flag: 'flag{implicit}' } },
    ])
  })

  test('v2 update without flags keeps the current entries', async () => {
    const id = trackChallenge(crypto.randomUUID())
    const flags = [{ provider: 'flags/static', config: { flag: 'flag{keep}' } }]

    await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { ...baseData, flags } },
      }),
      GoodChallengeUpdateV2
    )

    const putBody = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { name: 'Renamed' } },
      }),
      GoodChallengeUpdateV2
    )
    expect(putBody.data.flags).toEqual(flags)
  })

  test('v2 rejects unknown providers and invalid configs', async () => {
    const id = trackChallenge(crypto.randomUUID())

    await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: {
          data: {
            ...baseData,
            flags: [{ provider: 'nope', config: { flag: 'flag{x}' } }],
          },
        },
      }),
      BadBody
    )

    await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: {
          data: {
            ...baseData,
            flags: [{ provider: 'flags/static', config: {} }],
          },
        },
      }),
      BadBody
    )

    await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: {
          data: {
            ...baseData,
            flags: [{ provider: 'flags/static', config: { flag: '' } }],
          },
        },
      }),
      BadBody
    )

    // inherited object properties must not resolve as providers
    await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: {
          data: {
            ...baseData,
            flags: [{ provider: 'constructor', config: { flag: 'flag{x}' } }],
          },
        },
      }),
      BadBody
    )
  })

  test('v1 flag string maps to a single static entry', async () => {
    const id = trackChallenge(crypto.randomUUID())

    const putBody = await expectResponse(
      await adminRequest(`/api/v1/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { ...baseData, flag: 'flag{v1}' } },
      }),
      GoodChallengeUpdate
    )
    expect(putBody.data.flag).toBe('flag{v1}')
    expect(putBody.data).not.toHaveProperty('flags')

    const v2Body = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`),
      GoodAdminChallengeV2
    )
    expect(v2Body.data.flags).toEqual([
      { provider: 'flags/static', config: { flag: 'flag{v1}' } },
    ])

    const v1Body = await expectResponse(
      await adminRequest(`/api/v1/admin/challs/${id}`),
      GoodAdminChallenge
    )
    expect(v1Body.data.flag).toBe('flag{v1}')
    expect(v1Body.data).not.toHaveProperty('flags')
  })

  test('v1 empty flag clears the entries', async () => {
    const id = trackChallenge(crypto.randomUUID())

    await expectResponse(
      await adminRequest(`/api/v1/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { ...baseData, flag: 'flag{v1}' } },
      }),
      GoodChallengeUpdate
    )
    await expectResponse(
      await adminRequest(`/api/v1/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { flag: '' } },
      }),
      GoodChallengeUpdate
    )

    const v2Body = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`),
      GoodAdminChallengeV2
    )
    expect(v2Body.data.flags).toEqual([])
  })

  test('v1 shows the first static entry of a multi-flag challenge', async () => {
    const id = trackChallenge(crypto.randomUUID())

    await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: {
          data: {
            ...baseData,
            flags: [
              { provider: 'flags/static', config: { flag: 'flag{first}' } },
              { provider: 'flags/static', config: { flag: 'flag{second}' } },
            ],
          },
        },
      }),
      GoodChallengeUpdateV2
    )

    const v1Body = await expectResponse(
      await adminRequest(`/api/v1/admin/challs/${id}`),
      GoodAdminChallenge
    )
    expect(v1Body.data.flag).toBe('flag{first}')
  })
})
