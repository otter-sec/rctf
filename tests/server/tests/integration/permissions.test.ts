import { BadPerms, Permissions } from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Hono } from 'hono'
import { createToken, TokenKind } from '../../../../apps/api/src/lib/tokens'
import { getApp, request } from '../../app'
import { expectResponse, generateRealTestUser } from '../../util'

let app: Hono<any>
let readOnlyUser: Awaited<ReturnType<typeof generateRealTestUser>>
let writeOnlyUser: Awaited<ReturnType<typeof generateRealTestUser>>
let readWriteUser: Awaited<ReturnType<typeof generateRealTestUser>>
let unprivilegedUser: Awaited<ReturnType<typeof generateRealTestUser>>

beforeAll(async () => {
  app = await getApp()
  readOnlyUser = await generateRealTestUser(Permissions.challsRead)
  writeOnlyUser = await generateRealTestUser(Permissions.challsWrite)
  readWriteUser = await generateRealTestUser(
    Permissions.challsRead | Permissions.challsWrite
  )
  unprivilegedUser = await generateRealTestUser()
})

afterAll(async () => {
  await readOnlyUser.cleanup()
  await writeOnlyUser.cleanup()
  await readWriteUser.cleanup()
  await unprivilegedUser.cleanup()
})

const authHeaders = async (userId: string) => ({
  Authorization: `Bearer ${await createToken(TokenKind.Auth, userId)}`,
})

describe('permissions', () => {
  describe('route requiring challsRead', () => {
    const path = '/api/v2/admin/challs'

    test('allows user with challsRead', async () => {
      const res = await request(app, path, {
        method: 'GET',
        headers: await authHeaders(readOnlyUser.user.id),
      })
      expect(res.status).not.toBe(BadPerms.status)
    })

    test('allows user with challsRead | challsWrite', async () => {
      const res = await request(app, path, {
        method: 'GET',
        headers: await authHeaders(readWriteUser.user.id),
      })
      expect(res.status).not.toBe(BadPerms.status)
    })

    test('rejects user with only challsWrite', async () => {
      const res = await request(app, path, {
        method: 'GET',
        headers: await authHeaders(writeOnlyUser.user.id),
      })
      await expectResponse(res, BadPerms)
    })

    test('rejects unprivileged user', async () => {
      const res = await request(app, path, {
        method: 'GET',
        headers: await authHeaders(unprivilegedUser.user.id),
      })
      await expectResponse(res, BadPerms)
    })
  })

  describe('route requiring challsWrite', () => {
    const path = '/api/v2/admin/challs/nonexistent'
    const body = { data: { name: 'test' } }

    test('allows user with challsWrite', async () => {
      const res = await request(app, path, {
        method: 'PUT',
        headers: {
          ...(await authHeaders(writeOnlyUser.user.id)),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      expect(res.status).not.toBe(BadPerms.status)
    })

    test('allows user with challsRead | challsWrite', async () => {
      const res = await request(app, path, {
        method: 'PUT',
        headers: {
          ...(await authHeaders(readWriteUser.user.id)),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      expect(res.status).not.toBe(BadPerms.status)
    })

    test('rejects user with only challsRead', async () => {
      const res = await request(app, path, {
        method: 'PUT',
        headers: {
          ...(await authHeaders(readOnlyUser.user.id)),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      await expectResponse(res, BadPerms)
    })

    test('rejects unprivileged user', async () => {
      const res = await request(app, path, {
        method: 'PUT',
        headers: {
          ...(await authHeaders(unprivilegedUser.user.id)),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      await expectResponse(res, BadPerms)
    })
  })

  describe('route requiring usersWrite', () => {
    const path = '/api/v2/admin/users?limit=10&offset=0'

    test('allows user with usersWrite', async () => {
      const usersWriteUser = await generateRealTestUser(Permissions.usersWrite)
      try {
        const res = await request(app, path, {
          method: 'GET',
          headers: await authHeaders(usersWriteUser.user.id),
        })
        expect(res.status).not.toBe(BadPerms.status)
      } finally {
        await usersWriteUser.cleanup()
      }
    })

    test('rejects user with only challsRead | challsWrite', async () => {
      const res = await request(app, path, {
        method: 'GET',
        headers: await authHeaders(readWriteUser.user.id),
      })
      await expectResponse(res, BadPerms)
    })
  })
})
