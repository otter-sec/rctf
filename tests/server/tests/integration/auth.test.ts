import { config } from '@rctf/config'
import {
  BadEmail,
  BadKnownEmail,
  BadKnownName,
  BadRegistrationsDisabled,
  GoodLogin,
  GoodRegister,
  GoodRegisterV2,
  GoodToken,
  GoodUserUpdate,
  GoodVerifySent,
} from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Hono } from 'hono'
import { createLoginVerification } from '../../../../apps/api/src/cache/auth-cache'
import { createToken, TokenKind } from '../../../../apps/api/src/lib/tokens'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { getApp, request } from '../../app'
import {
  deleteUserByEmail,
  expectResponse,
  generateTestUser,
  getUserByEmail,
} from '../../util'

let app: Hono<any>
const testUser = generateTestUser()
let oldEmail: typeof config.email

beforeAll(async () => {
  app = await getApp()
  oldEmail = config.email
})

afterAll(async () => {
  config.email = oldEmail
  await deleteUserByEmail(testUser.email)
})

describe('auth', () => {
  test('fails with badEmail', async () => {
    const res = await request(app, '/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...testUser,
        email: 'notanemail',
      }),
    })

    await expectResponse(res, BadEmail)
  })

  // in v1 it was badUnknownEmail, but in v2 it was changed to goodVerifySent
  test('succeeds with goodVerifySent on recover', async () => {
    const unknownEmail = `non-existent-email${Math.random()}@gmail.com`
    const res = await request(app, '/api/v1/auth/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: unknownEmail,
      }),
    })

    await expectResponse(res, GoodVerifySent)
  })

  test('when not email, succeeds with goodRegister', async () => {
    config.email = undefined

    let res = await request(app, '/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })

    const body = await expectResponse(res, GoodRegister)
    expect(typeof body.data.authToken).toBe('string')
    expect('teamToken' in body.data).toBe(false)

    // Test the token works
    res = await request(app, '/api/v1/auth/test', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${body.data.authToken}`,
      },
    })

    await expectResponse(res, GoodToken)
  })

  test('v2 register returns team token', async () => {
    config.email = undefined
    const v2User = generateTestUser()

    try {
      let res = await request(app, '/api/v2/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v2User),
      })

      const body = await expectResponse(res, GoodRegisterV2)
      expect(typeof body.data.authToken).toBe('string')
      expect(typeof body.data.teamToken).toBe('string')

      res = await request(app, '/api/v1/auth/test', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${body.data.authToken}`,
        },
      })

      await expectResponse(res, GoodToken)

      res = await request(app, '/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamToken: body.data.teamToken }),
      })

      const loginBody = await expectResponse(res, GoodLogin)
      expect(typeof loginBody.data.authToken).toBe('string')
    } finally {
      await deleteUserByEmail(v2User.email)
    }
  })

  test('v2 verify registration returns team token', async () => {
    const redis = await createRedis()
    const v2User = generateTestUser()
    const verifyToken = await createLoginVerification(redis, {
      kind: 'register',
      email: v2User.email,
      name: v2User.name,
      division: v2User.division,
    })

    try {
      let res = await request(app, '/api/v2/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifyToken }),
      })

      const body = await expectResponse(res, GoodRegisterV2)
      expect(typeof body.data.authToken).toBe('string')
      expect(typeof body.data.teamToken).toBe('string')

      res = await request(app, '/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamToken: body.data.teamToken }),
      })

      const loginBody = await expectResponse(res, GoodLogin)
      expect(typeof loginBody.data.authToken).toBe('string')
    } finally {
      await deleteUserByEmail(v2User.email)
    }
  })

  test('duplicate email fails with badKnownEmail', async () => {
    config.email = undefined

    const res = await request(app, '/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...testUser,
        name: String(Math.random()),
      }),
    })

    await expectResponse(res, BadKnownEmail)
  })

  test('duplicate name fails with badKnownName', async () => {
    config.email = undefined

    const res = await request(app, '/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...testUser,
        email: `non-existent-email${Math.random()}@gmail.com`,
      }),
    })

    await expectResponse(res, BadKnownName)
  })

  test('succeeds with goodUserUpdate', async () => {
    config.email = undefined

    const user = await getUserByEmail(testUser.email)
    expect(user).toBeDefined()

    const nextUser = generateTestUser()
    const authToken = await createToken(TokenKind.Auth, user!.id)

    const res = await request(app, '/api/v1/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: nextUser.name,
        division: nextUser.division,
      }),
    })

    const body = await expectResponse(res, GoodUserUpdate)
    const respUser = body.data.user
    expect(respUser.name).toBe(nextUser.name)
    expect(respUser.email).toBe(testUser.email)
    expect(respUser.division).toBe(nextUser.division)

    // Update testUser for cleanup
    testUser.name = respUser.name
    testUser.division = respUser.division
  })

  test('fails with badRegistrationsDisabled', async () => {
    const oldRegistrations = config.registrationsEnabled
    config.registrationsEnabled = false

    try {
      const res = await request(app, '/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateTestUser()),
      })

      await expectResponse(res, BadRegistrationsDisabled)
    } finally {
      config.registrationsEnabled = oldRegistrations
    }
  })
})
