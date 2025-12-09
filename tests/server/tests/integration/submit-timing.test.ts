import { afterAll, beforeAll, describe, test } from 'bun:test'
import { config } from '@rctf/config'
import { BadEnded, BadNotStarted } from '@rctf/types'
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

describe('submit-timing', () => {
  test('fails with badNotStarted', async () => {
    const oldTime = config.startTime
    config.startTime = Date.now() + 10 * 60 * 1000

    try {
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

      await expectResponse(res, BadNotStarted)
    } finally {
      config.startTime = oldTime
    }
  })

  test('fails with badEnded', async () => {
    const oldTime = config.endTime
    config.endTime = Date.now() - 1

    try {
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

      await expectResponse(res, BadEnded)
    } finally {
      config.endTime = oldTime
    }
  })
})
