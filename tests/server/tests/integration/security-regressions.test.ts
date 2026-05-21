import { config } from '@rctf/config'
import { createDatabase, users } from '@rctf/db'
import { BadBody, BadPerms, Permissions } from '@rctf/types'
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import {
  clearDatabase,
  expectResponse,
  generateAuthToken,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>
const getDb = () => createDatabase(config.database.sql).db

const authHeaders = async (userId: string) => ({
  Authorization: `Bearer ${await generateAuthToken(userId)}`,
})

beforeAll(async () => {
  app = await getApp()
})

beforeEach(async () => {
  await clearDatabase()
})

describe('security regressions', () => {
  test('banned users cannot reach infra-heavy integration routes', async () => {
    const bannedUser = await generateRealTestUser()
    const db = getDb()
    await db
      .update(users)
      .set({ banned: true })
      .where(eq(users.id, bannedUser.user.id))

    const challengeId = crypto.randomUUID()
    const jobId = crypto.randomUUID()
    const headers = await authHeaders(bannedUser.user.id)
    const routes: Array<{
      method: string
      path: string
      body?: Record<string, unknown>
    }> = [
      {
        method: 'GET',
        path: `/api/v2/integrations/challs/${challengeId}/instance`,
      },
      {
        method: 'PUT',
        path: `/api/v2/integrations/challs/${challengeId}/instance`,
        body: { captchaCode: '' },
      },
      {
        method: 'PATCH',
        path: `/api/v2/integrations/challs/${challengeId}/instance`,
        body: { captchaCode: '' },
      },
      {
        method: 'DELETE',
        path: `/api/v2/integrations/challs/${challengeId}/instance`,
      },
      {
        method: 'GET',
        path: `/api/v2/integrations/challs/${challengeId}/admin-bot/status`,
      },
      {
        method: 'GET',
        path: `/api/v2/integrations/challs/${challengeId}/admin-bot/history`,
      },
      {
        method: 'GET',
        path: `/api/v2/integrations/challs/${challengeId}/admin-bot/jobs/${jobId}/logs`,
      },
      {
        method: 'POST',
        path: `/api/v2/integrations/challs/${challengeId}/admin-bot`,
        body: { inputs: {}, captchaCode: '' },
      },
    ]

    for (const route of routes) {
      const res = await request(app, route.path, {
        method: route.method,
        headers: {
          ...headers,
          ...(route.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: route.body ? JSON.stringify(route.body) : undefined,
      })

      await expectResponse(res, BadPerms)
    }
  })

  test('upload query rejects unsafe attachment keys', async () => {
    const admin = await generateRealTestUser(Permissions.challsRead)
    const headers = await authHeaders(admin.user.id)
    const validSha256 = 'a'.repeat(64)
    const unsafeUploads = [
      {
        upload: { sha256: '../not-a-hash', name: 'file.txt' },
        field: 'sha256',
      },
      { upload: { sha256: validSha256, name: '../file.txt' }, field: 'name' },
      { upload: { sha256: validSha256, name: '..' }, field: 'name' },
      { upload: { sha256: validSha256, name: 'file.txt:ads' }, field: 'name' },
    ]

    for (const { upload, field } of unsafeUploads) {
      const res = await request(app, '/api/v2/admin/upload/query', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uploads: [upload] }),
      })

      const body = await expectResponse(res, BadBody)
      expect(body.data.reason).toContain(`body:uploads.0.${field}`)
    }
  })
})
