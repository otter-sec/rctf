import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { config } from '@rctf/config'
import { GoodRegister, GoodUserSelfData } from '@rctf/types'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import { deleteUserByEmail, expectResponse, generateTestUser } from '../../util'

let app: Hono<any>
const testUser = generateTestUser()
let oldEmail: typeof config.email

beforeAll(async () => {
  app = await getApp()
  oldEmail = config.email
  config.email = undefined
})

afterAll(async () => {
  await deleteUserByEmail(testUser.email)
  config.email = oldEmail
})

describe('profile', () => {
  test('succeeds with goodUserSelfData', async () => {
    let res = await request(app, '/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })

    const registerBody = await expectResponse(res, GoodRegister)
    const authToken = registerBody.data.authToken

    res = await request(app, '/api/v1/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    const body = await expectResponse(res, GoodUserSelfData)
    expect(body.data.name).toBe(testUser.name)
  })
})
