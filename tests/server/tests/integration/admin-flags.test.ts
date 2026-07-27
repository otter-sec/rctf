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

    expect(names).toContain('flags/regex')
    const regexProvider = body.data.providers.find(
      p => p.name === 'flags/regex'
    )!
    expect(regexProvider.schema.type).toBe('object')
    expect(regexProvider.schema.required).toEqual(['pattern'])
  })
})

describe('admin flag entries', () => {
  test('v2 flags round-trip and default an omitted provider', async () => {
    const id = trackChallenge(crypto.randomUUID())
    const flags = [
      { provider: 'flags/static', config: { flag: 'flag{one}' } },
      { config: { flag: 'flag{implicit}' } },
    ]
    const normalized = [
      { provider: 'flags/static', config: { flag: 'flag{one}' } },
      { provider: 'flags/static', config: { flag: 'flag{implicit}' } },
    ]

    const putRes = await adminRequest(`/api/v2/admin/challs/${id}`, {
      method: 'PUT',
      body: { data: { ...baseData, flags } },
    })
    const putBody = await expectResponse(putRes, GoodChallengeUpdateV2)
    expect(putBody.data.flags).toEqual(normalized)

    const getRes = await adminRequest(`/api/v2/admin/challs/${id}`)
    const getBody = await expectResponse(getRes, GoodAdminChallengeV2)
    expect(getBody.data.flags).toEqual(normalized)
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

  test('v2 accepts the deprecated scalar flag without persisting it', async () => {
    const id = trackChallenge(crypto.randomUUID())

    const putBody = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { ...baseData, flag: 'flag{legacy-v2}' } },
      }),
      GoodChallengeUpdateV2
    )
    expect(putBody.data.flags).toEqual([
      {
        provider: 'flags/static',
        config: { flag: 'flag{legacy-v2}' },
      },
    ])
    expect(putBody.data).not.toHaveProperty('flag')

    const getBody = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`),
      GoodAdminChallengeV2
    )
    expect(getBody.data.flags).toEqual(putBody.data.flags)
    expect(getBody.data).not.toHaveProperty('flag')

    const clearedBody = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { flag: '' } },
      }),
      GoodChallengeUpdateV2
    )
    expect(clearedBody.data.flags).toEqual([])
  })

  test('v2 rejects ambiguous scalar and entry-list flags', async () => {
    const id = trackChallenge(crypto.randomUUID())

    await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: {
          data: {
            ...baseData,
            flag: 'flag{legacy-v2}',
            flags: [
              {
                provider: 'flags/static',
                config: { flag: 'flag{new-v2}' },
              },
            ],
          },
        },
      }),
      BadBody
    )
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
            flags: [
              {
                provider: 'flags/static',
                config: { flag: 'flag{x}', typo: true },
              },
            ],
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

  test('v1 flag string maps onto the entry list', async () => {
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

    await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: {
          data: {
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
    expect(v1Body.data).not.toHaveProperty('flags')

    await expectResponse(
      await adminRequest(`/api/v1/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { flag: '' } },
      }),
      GoodChallengeUpdate
    )
    const clearedBody = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`),
      GoodAdminChallengeV2
    )
    expect(clearedBody.data.flags).toEqual([])
  })
})

describe('admin regex flag entries', () => {
  test('v2 regex entries round-trip through update and get', async () => {
    const id = trackChallenge(crypto.randomUUID())
    const flags = [
      {
        provider: 'flags/regex',
        config: { pattern: '^flag\\{[0-9]+\\}$', flags: 'i' },
      },
    ]

    const putBody = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { ...baseData, flags } },
      }),
      GoodChallengeUpdateV2
    )
    expect(putBody.data.flags).toEqual(flags)

    const getBody = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`),
      GoodAdminChallengeV2
    )
    expect(getBody.data.flags).toEqual(flags)

    const v1Body = await expectResponse(
      await adminRequest(`/api/v1/admin/challs/${id}`),
      GoodAdminChallenge
    )
    expect(v1Body.data.flag).toBe('')
  })

  test('v2 rejects invalid regex configs', async () => {
    const id = trackChallenge(crypto.randomUUID())
    const invalidConfigs = [
      {},
      { pattern: '(' },
      { pattern: 'flag', flags: 'x' }, // unknown flag
      { pattern: 'flag', flgas: 'i' }, // unknown option
      { pattern: 'flag', flags: 'gg' }, // duplicate flags
      { pattern: 'flag', flags: 'uv' }, // u and v
      { pattern: '\\p{Invalid}', flags: 'u' }, // compiles alone but not with flags
    ]

    for (const config of invalidConfigs) {
      await expectResponse(
        await adminRequest(`/api/v2/admin/challs/${id}`, {
          method: 'PUT',
          body: {
            data: { ...baseData, flags: [{ provider: 'flags/regex', config }] },
          },
        }),
        BadBody
      )
    }
  })

  test('v1 flag update replaces regex entries, other updates keep them', async () => {
    const id = trackChallenge(crypto.randomUUID())
    const flags = [
      { provider: 'flags/regex', config: { pattern: '^x$' } },
      { provider: 'flags/static', config: { flag: 'flag{old}' } },
    ]

    await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { ...baseData, flags } },
      }),
      GoodChallengeUpdateV2
    )

    await expectResponse(
      await adminRequest(`/api/v1/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { name: 'Renamed via v1' } },
      }),
      GoodChallengeUpdate
    )
    const keptBody = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`),
      GoodAdminChallengeV2
    )
    expect(keptBody.data.flags).toEqual(flags)

    await expectResponse(
      await adminRequest(`/api/v1/admin/challs/${id}`, {
        method: 'PUT',
        body: { data: { flag: 'flag{new}' } },
      }),
      GoodChallengeUpdate
    )
    const replacedBody = await expectResponse(
      await adminRequest(`/api/v2/admin/challs/${id}`),
      GoodAdminChallengeV2
    )
    expect(replacedBody.data.flags).toEqual([
      { provider: 'flags/static', config: { flag: 'flag{new}' } },
    ])
  })
})
