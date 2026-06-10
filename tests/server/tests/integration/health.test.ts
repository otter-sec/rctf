import { describe, expect, test } from 'bun:test'
import { getApp, request } from '../../app'

describe('health endpoints', () => {
  test('healthz returns ok', async () => {
    const app = await getApp()
    const res = await request(app, '/api/healthz', { method: 'GET' })

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })

  test('readyz returns ok when postgres and redis are reachable', async () => {
    const app = await getApp()
    const res = await request(app, '/api/readyz', { method: 'GET' })

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})
