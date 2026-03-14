import { config } from '@rctf/config'
import {
  BadNotStarted,
  BadToken,
  GoodChallenges,
  Permissions,
} from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Hono } from 'hono'
import { createToken, TokenKind } from '../../../../apps/api/src/lib/tokens'
import { getApp, request } from '../../app'
import { expectResponse, generateRealTestUser } from '../../util'

let app: Hono<any>
let userData: Awaited<ReturnType<typeof generateRealTestUser>>
let adminData: Awaited<ReturnType<typeof generateRealTestUser>>

beforeAll(async () => {
  app = await getApp()
  userData = await generateRealTestUser()
  adminData = await generateRealTestUser(Permissions.challsRead)
})

afterAll(async () => {
  await userData.cleanup()
  await adminData.cleanup()
})

describe('challenges', () => {
  test('fails with badToken when unauthorized', async () => {
    const res = await request(app, '/api/v2/users/me', {
      method: 'GET',
    })

    await expectResponse(res, BadToken)
  })

  test('fails with badNotStarted', async () => {
    const oldTime = config.startTime
    config.startTime = Date.now() + 10 * 60 * 1000

    try {
      const authToken = await createToken(TokenKind.Auth, userData.user.id)
      const res = await request(app, '/api/v1/challs', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      await expectResponse(res, BadNotStarted)
    } finally {
      config.startTime = oldTime
    }
  })

  test('succeeds with goodChallenges', async () => {
    const authToken = await createToken(TokenKind.Auth, userData.user.id)
    const res = await request(app, '/api/v1/challs', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    const body = await expectResponse(res, GoodChallenges)
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('succeeds with goodChallenges for admin before start', async () => {
    const oldTime = config.startTime
    config.startTime = Date.now() + 10 * 60 * 1000

    try {
      const authToken = await createToken(TokenKind.Auth, adminData.user.id)
      const res = await request(app, '/api/v1/challs', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      await expectResponse(res, GoodChallenges)
    } finally {
      config.startTime = oldTime
    }
  })
})
