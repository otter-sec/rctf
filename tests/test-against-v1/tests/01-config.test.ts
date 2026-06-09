import { describe, expect, test } from 'bun:test'
import {
  all,
  assertAllKind,
  assertAllSuccess,
  assertSame,
} from '../lib/harness'

describe('Integrations - Client Config', () => {
  test('GET /api/v1/integrations/client/config returns same response', async () => {
    const res = await all('/api/v1/integrations/client/config')

    assertAllSuccess(res)
    assertAllKind(res, 'goodClientConfig')
    assertSame(res)
  })

  test('client config has required fields', async () => {
    const res = await all('/api/v1/integrations/client/config')

    for (const r of Object.values(res)) {
      expect(r.status).toBe(200)
      const body = r.body as { kind: string; data: Record<string, unknown> }
      expect(body.kind).toBe('goodClientConfig')
      expect(body.data).toBeDefined()

      expect(body.data.ctfName).toBeDefined()
      expect(body.data.divisions).toBeDefined()
      expect(body.data.startTime).toBeDefined()
      expect(body.data.endTime).toBeDefined()
    }
  })
})
