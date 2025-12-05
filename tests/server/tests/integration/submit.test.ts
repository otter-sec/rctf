import {
  BadAlreadySolvedChallenge,
  BadChallenge,
  BadFlag,
  BadJson,
  BadToken,
  GoodFlag,
} from '@rctf/types'
import { afterAll, beforeAll, describe, test } from 'bun:test'
import type { Hono } from 'hono'
import { createToken, TokenKind } from '../../../../apps/api/src/lib/tokens'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateChallenge,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>
let challengeData: Awaited<ReturnType<typeof generateChallenge>>
let userData: Awaited<ReturnType<typeof generateRealTestUser>>

beforeAll(async () => {
  app = await getApp()
  challengeData = await generateChallenge()
  userData = await generateRealTestUser()
})

afterAll(async () => {
  await userData.cleanup()
  await challengeData.cleanup()
})

describe('submit', () => {
  test('fails with badToken when unauthorized', async () => {
    const res = await request(app, '/api/v1/challs/1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag: 'wrong_flag' }),
    })

    await expectResponse(res, BadToken)
  })

  // in v1 it was badBody, but in v2 it was changed to badJson
  test('fails with badJson', async () => {
    const authToken = await createToken(TokenKind.Auth, userData.user.id)
    const res = await request(
      app,
      `/api/v1/challs/${encodeURIComponent(challengeData.challenge.id)}/submit`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    )

    await expectResponse(res, BadJson)
  })

  test('fails with badChallenge', async () => {
    const badChallengeId = crypto.randomUUID()
    const authToken = await createToken(TokenKind.Auth, userData.user.id)
    const res = await request(
      app,
      `/api/v1/challs/${encodeURIComponent(badChallengeId)}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ flag: 'wrong_flag' }),
      }
    )

    await expectResponse(res, BadChallenge)
  })

  test('fails with badFlag', async () => {
    const authToken = await createToken(TokenKind.Auth, userData.user.id)
    const res = await request(
      app,
      `/api/v1/challs/${encodeURIComponent(challengeData.challenge.id)}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ flag: 'wrong_flag' }),
      }
    )

    await expectResponse(res, BadFlag)
  })

  test('succeeds with goodFlag', async () => {
    const authToken = await createToken(TokenKind.Auth, userData.user.id)
    const res = await request(
      app,
      `/api/v1/challs/${encodeURIComponent(challengeData.challenge.id)}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ flag: challengeData.challenge.flag }),
      }
    )

    await expectResponse(res, GoodFlag)
  })

  test('fails with badAlreadySolvedChallenge', async () => {
    const authToken = await createToken(TokenKind.Auth, userData.user.id)
    const res = await request(
      app,
      `/api/v1/challs/${encodeURIComponent(challengeData.challenge.id)}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ flag: challengeData.challenge.flag }),
      }
    )

    await expectResponse(res, BadAlreadySolvedChallenge)
  })
})
