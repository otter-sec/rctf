import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { config } from '@rctf/config'
import {
  BadEmail,
  BadKnownEmail,
  BadKnownName,
  BadRegistrationsDisabled,
  GoodRegister,
  GoodToken,
  GoodUserUpdate,
  GoodVerifySent,
} from '@rctf/types'
import type { Hono } from 'hono'
import { createToken, TokenKind } from '../../../../apps/api/src/lib/tokens'
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

    // Test the token works
    res = await request(app, '/api/v1/auth/test', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${body.data.authToken}`,
      },
    })

    await expectResponse(res, GoodToken)
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
