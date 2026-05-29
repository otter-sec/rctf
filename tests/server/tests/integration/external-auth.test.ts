import { config } from '@rctf/config'
import { createDatabase, externalAuthClients } from '@rctf/db'
import {
  BadExternalAuthRequest,
  BadPerms,
  BadToken,
  GoodAdminExternalAuthClientCreate,
  GoodAdminExternalAuthClientDelete,
  GoodAdminExternalAuthClients,
  GoodExternalAuthAuthorize,
  GoodExternalAuthClient,
  GoodExternalAuthToken,
  Permissions,
} from '@rctf/types'
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { getApp, request } from '../../app'
import {
  clearDatabase,
  expectResponse,
  generateAuthToken,
  generateRealTestUser,
} from '../../util'

const getDb = () => createDatabase(config.database.sql).db

let app: Hono<any>

const createClient = async (overrides?: {
  name?: string
  redirectUri?: string
}): Promise<{
  adminToken: string
  client: { id: string; name: string; redirectUri: string }
  secret: string
}> => {
  const admin = await generateRealTestUser(Permissions.usersWrite)
  const adminToken = await generateAuthToken(admin.user.id)
  const res = await request(app, '/api/v2/admin/external-auth/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: overrides?.name ?? 'Test App',
      redirectUri: overrides?.redirectUri ?? 'https://example.test/cb',
    }),
  })
  const body = (await expectResponse(
    res,
    GoodAdminExternalAuthClientCreate
  )) as {
    data: {
      id: string
      name: string
      redirectUri: string
      secret: string
    }
  }
  return {
    adminToken,
    client: {
      id: body.data.id,
      name: body.data.name,
      redirectUri: body.data.redirectUri,
    },
    secret: body.data.secret,
  }
}

const authorize = async (
  userToken: string,
  body: { clientId: string; redirectUri: string; state?: string }
): Promise<Response> =>
  request(app, '/api/v2/external-auth/authorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify(body),
  })

const exchange = async (body: {
  clientId: string
  clientSecret: string
  code: string
}): Promise<Response> =>
  request(app, '/api/v2/external-auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const codeFromRedirectTo = (redirectTo: string): string => {
  const url = new URL(redirectTo)
  const code = url.searchParams.get('code')
  if (!code) {
    throw new Error(`no code in redirectTo: ${redirectTo}`)
  }
  return code
}

beforeAll(async () => {
  app = await getApp()
})

beforeEach(async () => {
  await clearDatabase()
  const redis = await createRedis()
  await redis.flushdb()
})

describe('external-auth happy path', () => {
  test('register client -> authorize -> token -> use against /users/me', async () => {
    const { client, secret } = await createClient()
    const { user } = await generateRealTestUser()
    const sessionToken = await generateAuthToken(user.id)

    const authRes = await authorize(sessionToken, {
      clientId: client.id,
      redirectUri: client.redirectUri,
      state: 'abc-123',
    })
    const authBody = (await expectResponse(
      authRes,
      GoodExternalAuthAuthorize
    )) as {
      data: { redirectTo: string }
    }
    const url = new URL(authBody.data.redirectTo)
    expect(url.origin + url.pathname).toBe(client.redirectUri)
    expect(url.searchParams.get('state')).toBe('abc-123')

    const code = codeFromRedirectTo(authBody.data.redirectTo)
    const tokenRes = await exchange({
      clientId: client.id,
      clientSecret: secret,
      code,
    })
    const tokenBody = (await expectResponse(
      tokenRes,
      GoodExternalAuthToken
    )) as {
      data: { accessToken: string; tokenType: 'bearer' }
    }
    expect(tokenBody.data.tokenType).toBe('bearer')

    const meRes = await request(app, '/api/v1/users/me', {
      headers: { Authorization: `Bearer ${tokenBody.data.accessToken}` },
    })
    expect(meRes.status).toBe(200)
    const meBody = (await meRes.json()) as { data?: { id?: string } }
    expect(meBody.data?.id).toBe(user.id)
  })

  test('state with URL-unsafe characters round-trips encoded', async () => {
    const { client } = await createClient()
    const { user } = await generateRealTestUser()
    const sessionToken = await generateAuthToken(user.id)

    const state = 'abc&def=ghi xyz/+%'
    const authRes = await authorize(sessionToken, {
      clientId: client.id,
      redirectUri: client.redirectUri,
      state,
    })
    const body = (await expectResponse(authRes, GoodExternalAuthAuthorize)) as {
      data: { redirectTo: string }
    }
    expect(new URL(body.data.redirectTo).searchParams.get('state')).toBe(state)
  })

  test('client lookup returns name and redirectUri without secret', async () => {
    const { client } = await createClient({ name: 'My App' })
    const res = await request(app, `/api/v2/external-auth/clients/${client.id}`)
    const body = (await expectResponse(res, GoodExternalAuthClient)) as {
      data: { id: string; name: string; redirectUri: string }
    }
    expect(body.data).toEqual({
      id: client.id,
      name: 'My App',
      redirectUri: client.redirectUri,
    })
    expect(JSON.stringify(body)).not.toContain('secret')
  })
})

describe('external-auth rejection paths', () => {
  test('unknown client_id on /authorize -> badExternalAuthRequest', async () => {
    const { user } = await generateRealTestUser()
    const sessionToken = await generateAuthToken(user.id)
    const res = await authorize(sessionToken, {
      clientId: crypto.randomUUID(),
      redirectUri: 'https://example.test/cb',
    })
    await expectResponse(res, BadExternalAuthRequest)
  })

  test('redirect_uri mismatch on /authorize -> badExternalAuthRequest', async () => {
    const { client } = await createClient({
      redirectUri: 'https://allowed.test/cb',
    })
    const { user } = await generateRealTestUser()
    const sessionToken = await generateAuthToken(user.id)

    const res = await authorize(sessionToken, {
      clientId: client.id,
      redirectUri: 'https://attacker.test/cb',
    })
    await expectResponse(res, BadExternalAuthRequest)
  })

  test('redirect_uri exact match - trailing slash and case-sensitive', async () => {
    const { client } = await createClient({
      redirectUri: 'https://example.test/cb',
    })
    const { user } = await generateRealTestUser()
    const sessionToken = await generateAuthToken(user.id)

    const trailingSlash = await authorize(sessionToken, {
      clientId: client.id,
      redirectUri: 'https://example.test/cb/',
    })
    await expectResponse(trailingSlash, BadExternalAuthRequest)

    const upperCase = await authorize(sessionToken, {
      clientId: client.id,
      redirectUri: 'https://example.test/CB',
    })
    await expectResponse(upperCase, BadExternalAuthRequest)
  })

  test('wrong client_secret on /token -> badExternalAuthRequest', async () => {
    const { client } = await createClient()
    const { user } = await generateRealTestUser()
    const sessionToken = await generateAuthToken(user.id)

    const authRes = await authorize(sessionToken, {
      clientId: client.id,
      redirectUri: client.redirectUri,
    })
    const code = codeFromRedirectTo(
      ((await authRes.json()) as { data: { redirectTo: string } }).data
        .redirectTo
    )

    const tokenRes = await exchange({
      clientId: client.id,
      clientSecret: 'not-the-real-secret',
      code,
    })
    await expectResponse(tokenRes, BadExternalAuthRequest)
  })

  test('wrong client_id on /token -> badExternalAuthRequest', async () => {
    const { client, secret } = await createClient()
    const { user } = await generateRealTestUser()
    const sessionToken = await generateAuthToken(user.id)

    const authRes = await authorize(sessionToken, {
      clientId: client.id,
      redirectUri: client.redirectUri,
    })
    const code = codeFromRedirectTo(
      ((await authRes.json()) as { data: { redirectTo: string } }).data
        .redirectTo
    )

    const tokenRes = await exchange({
      clientId: crypto.randomUUID(),
      clientSecret: secret,
      code,
    })
    await expectResponse(tokenRes, BadExternalAuthRequest)
  })

  test('code reuse: second /token call with same code fails', async () => {
    const { client, secret } = await createClient()
    const { user } = await generateRealTestUser()
    const sessionToken = await generateAuthToken(user.id)

    const authRes = await authorize(sessionToken, {
      clientId: client.id,
      redirectUri: client.redirectUri,
    })
    const code = codeFromRedirectTo(
      ((await authRes.json()) as { data: { redirectTo: string } }).data
        .redirectTo
    )

    await expectResponse(
      await exchange({ clientId: client.id, clientSecret: secret, code }),
      GoodExternalAuthToken
    )
    await expectResponse(
      await exchange({ clientId: client.id, clientSecret: secret, code }),
      BadExternalAuthRequest
    )
  })

  test('expired code: code is gone from redis -> badExternalAuthRequest', async () => {
    const { client, secret } = await createClient()
    const { user } = await generateRealTestUser()
    const sessionToken = await generateAuthToken(user.id)

    const authRes = await authorize(sessionToken, {
      clientId: client.id,
      redirectUri: client.redirectUri,
    })
    const code = codeFromRedirectTo(
      ((await authRes.json()) as { data: { redirectTo: string } }).data
        .redirectTo
    )

    const redis = await createRedis()
    await redis.del(`external-auth:code:${code}`)

    await expectResponse(
      await exchange({ clientId: client.id, clientSecret: secret, code }),
      BadExternalAuthRequest
    )
  })

  test('bogus code never issued -> badExternalAuthRequest', async () => {
    const { client, secret } = await createClient()
    await expectResponse(
      await exchange({
        clientId: client.id,
        clientSecret: secret,
        code: 'never-existed',
      }),
      BadExternalAuthRequest
    )
  })

  test('deleted client: pre-issued code no longer exchangeable', async () => {
    const { client, secret, adminToken } = await createClient()
    const { user } = await generateRealTestUser()
    const sessionToken = await generateAuthToken(user.id)

    const authRes = await authorize(sessionToken, {
      clientId: client.id,
      redirectUri: client.redirectUri,
    })
    const code = codeFromRedirectTo(
      ((await authRes.json()) as { data: { redirectTo: string } }).data
        .redirectTo
    )

    const delRes = await request(
      app,
      `/api/v2/admin/external-auth/clients/${client.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    await expectResponse(delRes, GoodAdminExternalAuthClientDelete)

    await expectResponse(
      await exchange({ clientId: client.id, clientSecret: secret, code }),
      BadExternalAuthRequest
    )
  })

  test('authorize requires an authenticated user', async () => {
    const { client } = await createClient()
    const res = await request(app, '/api/v2/external-auth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        redirectUri: client.redirectUri,
      }),
    })
    await expectResponse(res, BadToken)
  })

  test('unknown client lookup -> badExternalAuthRequest', async () => {
    const res = await request(
      app,
      `/api/v2/external-auth/clients/${crypto.randomUUID()}`
    )
    await expectResponse(res, BadExternalAuthRequest)
  })
})

describe('external-auth admin gating', () => {
  test('non-admin cannot list clients', async () => {
    const { user } = await generateRealTestUser()
    const userToken = await generateAuthToken(user.id)
    const res = await request(app, '/api/v2/admin/external-auth/clients', {
      headers: { Authorization: `Bearer ${userToken}` },
    })
    await expectResponse(res, BadPerms)
  })

  test('non-admin cannot create clients', async () => {
    const { user } = await generateRealTestUser()
    const userToken = await generateAuthToken(user.id)
    const res = await request(app, '/api/v2/admin/external-auth/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        name: 'x',
        redirectUri: 'https://example.test/cb',
      }),
    })
    await expectResponse(res, BadPerms)
  })

  test('non-admin cannot delete clients', async () => {
    const { client } = await createClient()
    const { user } = await generateRealTestUser()
    const userToken = await generateAuthToken(user.id)
    const res = await request(
      app,
      `/api/v2/admin/external-auth/clients/${client.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
      }
    )
    await expectResponse(res, BadPerms)
  })

  test('admin list returns created clients without secret_hash exposed', async () => {
    const { adminToken, client } = await createClient({ name: 'Listed App' })
    const res = await request(app, '/api/v2/admin/external-auth/clients', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const body = (await expectResponse(res, GoodAdminExternalAuthClients)) as {
      data: Array<{ id: string; name: string; redirectUri: string }>
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.id).toBe(client.id)
    expect(body.data[0]?.name).toBe('Listed App')
    expect(JSON.stringify(body)).not.toContain('secret_hash')
    expect(JSON.stringify(body)).not.toMatch(/"secret":/)
  })

  test('client secret is hashed at rest, never stored plaintext', async () => {
    const { secret, client } = await createClient()
    const db = getDb()
    const [row] = await db
      .select()
      .from(externalAuthClients)
      .where(eq(externalAuthClients.id, client.id))
    expect(row?.secretHash).toBeTruthy()
    expect(row?.secretHash).not.toBe(secret)
    expect(row?.secretHash).not.toContain(secret)
  })
})
