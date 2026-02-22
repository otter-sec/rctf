import { beforeAll, describe, expect, test } from 'bun:test'
import {
  all,
  assertAllKind,
  assertAllSuccess,
  assertSame,
  docker,
  instances,
  PROJECT,
} from '../lib/harness'

describe('Health Check', () => {
  test('all instances are reachable', async () => {
    const checks = await Promise.all(
      instances.map(async inst => {
        try {
          const res = await fetch(
            `${inst.url}/api/v1/integrations/client/config`
          )
          return { name: inst.name, ok: res.ok, status: res.status }
        } catch (e) {
          return { name: inst.name, ok: false, status: 0, error: e }
        }
      })
    )

    for (const check of checks) {
      expect(check.ok).toBe(true)
    }
  })

  test('client config endpoint returns success', async () => {
    const res = await all('/api/v1/integrations/client/config')

    assertAllSuccess(res)
    assertAllKind(res, 'goodClientConfig')
  })

  test('leaderboard endpoint returns same response', async () => {
    const res = await all('/api/v1/leaderboard/now?limit=10&offset=0')

    assertAllSuccess(res)
    assertSame(res)
  })

  test('leaderboard graph endpoint returns same response', async () => {
    const res = await all('/api/v1/leaderboard/graph?limit=10')

    assertAllSuccess(res)
    assertSame(res)
  })

  test('GET /api/v1/nonexistent returns badEndpoint', async () => {
    const res = await all('/api/v1/nonexistent')

    assertSame(res)
  })
})
