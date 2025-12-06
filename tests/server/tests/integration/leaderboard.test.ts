import { beforeAll, describe, expect, test } from 'bun:test'
import { GoodLeaderboard } from '@rctf/types'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import { expectResponse } from '../../util'

let app: Hono<any>

beforeAll(async () => {
  app = await getApp()
})

describe('leaderboard', () => {
  test('succeeds with goodLeaderboard', async () => {
    const res = await request(app, '/api/v1/leaderboard/now?limit=1&offset=0', {
      method: 'GET',
    })

    expect(res.headers.get('content-type')).toMatch(/json/)
    const body = await expectResponse(res, GoodLeaderboard)
    expect(Array.isArray(body.data.leaderboard)).toBe(true)
  })
})
