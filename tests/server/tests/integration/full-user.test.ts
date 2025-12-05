import {
  BadUnknownUser,
  GoodFlag,
  GoodUserData,
  GoodUserSelfData,
} from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Hono } from 'hono'
import { createToken, TokenKind } from '../../../../apps/api/src/lib/tokens'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateChallenge,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>

beforeAll(async () => {
  app = await getApp()
})

describe('full-user service', () => {
  describe('getFullUserFromId', () => {
    test('returns user data for existing user via /api/v1/users/:id', async () => {
      const { user, cleanup } = await generateRealTestUser()

      try {
        const res = await request(app, `/api/v1/users/${user.id}`, {
          method: 'GET',
        })

        const body = await expectResponse(res, GoodUserData)
        expect(body.data.name).toBe(user.name)
        expect(body.data.division).toBe(user.division)
        expect(Array.isArray(body.data.solves)).toBe(true)
      } finally {
        await cleanup()
      }
    })

    test('returns badUnknownUser for non-existent user', async () => {
      const nonExistentId = crypto.randomUUID()

      const res = await request(app, `/api/v1/users/${nonExistentId}`, {
        method: 'GET',
      })

      await expectResponse(res, BadUnknownUser)
    })
  })

  describe('getFullUser with solves', () => {
    test('returns user data with solved challenge info', async () => {
      // Create user and challenge
      const { user, cleanup: userCleanup } = await generateRealTestUser()
      const { challenge, cleanup: challengeCleanup } = await generateChallenge()

      try {
        const authToken = await generateAuthToken(user.id)

        // First, solve the challenge
        const submitRes = await request(
          app,
          `/api/v1/challs/${encodeURIComponent(challenge.id)}/submit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ flag: challenge.flag }),
          }
        )
        await expectResponse(submitRes, GoodFlag)

        // Now get the user profile which should include solves
        const profileRes = await request(app, '/api/v1/users/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })

        const body = await expectResponse(profileRes, GoodUserSelfData)
        expect(body.data.name).toBe(user.name)
        expect(Array.isArray(body.data.solves)).toBe(true)
        expect(body.data.solves.length).toBeGreaterThan(0)

        // Verify solve data structure (covers lines 50-55)
        const solve = body.data.solves[0]
        expect(solve).toHaveProperty('id')
        expect(solve).toHaveProperty('name')
        expect(solve).toHaveProperty('category')
        expect(solve).toHaveProperty('createdAt')
        expect(typeof solve.createdAt).toBe('number')
        expect(solve.id).toBe(challenge.id)
        expect(solve.name).toBe(challenge.name)
        expect(solve.category).toBe(challenge.category)
      } finally {
        await challengeCleanup()
        await userCleanup()
      }
    })

    test('returns user data via /api/v1/users/:id with solves', async () => {
      // Create user and challenge
      const { user, cleanup: userCleanup } = await generateRealTestUser()
      const { challenge, cleanup: challengeCleanup } = await generateChallenge()

      try {
        const authToken = await generateAuthToken(user.id)

        // Solve the challenge
        const submitRes = await request(
          app,
          `/api/v1/challs/${encodeURIComponent(challenge.id)}/submit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ flag: challenge.flag }),
          }
        )
        await expectResponse(submitRes, GoodFlag)

        // Get user by ID (tests getFullUserFromId with solves)
        const userRes = await request(app, `/api/v1/users/${user.id}`, {
          method: 'GET',
        })

        const body = await expectResponse(userRes, GoodUserData)
        expect(body.data.name).toBe(user.name)
        expect(Array.isArray(body.data.solves)).toBe(true)
        expect(body.data.solves.length).toBeGreaterThan(0)

        // Verify solve contains challenge info
        const solve = body.data.solves[0]
        expect(solve.id).toBe(challenge.id)
      } finally {
        await challengeCleanup()
        await userCleanup()
      }
    })
  })
})
