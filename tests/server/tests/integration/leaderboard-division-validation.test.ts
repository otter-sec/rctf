import { config } from '@rctf/config'
import { BadBody, GoodLeaderboard } from '@rctf/types'
import { beforeAll, describe, test } from 'bun:test'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import { expectResponse } from '../../util'

let app: Hono<any>

beforeAll(async () => {
  app = await getApp()
})

const prototypeProperties = ['__proto__']

const endpoints = [
  '/api/v1/leaderboard/now?limit=1&offset=0',
  '/api/v1/leaderboard/graph?limit=1',
  '/api/v2/leaderboard/now?limit=1&offset=0',
  '/api/v2/leaderboard/graph?limit=1&offset=0',
  '/api/v2/leaderboard/with-graph?limit=1&offset=0',
]

describe('leaderboard division validation', () => {
  test('accepts a valid division', async () => {
    const validDivision = Object.keys(config.divisions)[0]!
    const res = await request(
      app,
      `/api/v1/leaderboard/now?limit=1&offset=0&division=${validDivision}`,
      { method: 'GET' }
    )
    await expectResponse(res, GoodLeaderboard)
  })

  test('rejects a nonexistent division', async () => {
    const res = await request(
      app,
      '/api/v1/leaderboard/now?limit=1&offset=0&division=nonexistent',
      { method: 'GET' }
    )
    await expectResponse(res, BadBody)
  })

  for (const endpoint of endpoints) {
    describe(`${endpoint} rejects prototype properties`, () => {
      for (const prop of prototypeProperties) {
        test(`rejects division=${prop}`, async () => {
          const res = await request(
            app,
            `${endpoint}&division=${encodeURIComponent(prop)}`,
            { method: 'GET' }
          )
          await expectResponse(res, BadBody)
        })
      }
    })
  }
})
