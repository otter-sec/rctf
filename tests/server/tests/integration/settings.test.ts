import { config } from '@rctf/config'
import { createDatabase, settings } from '@rctf/db'
import {
  BadEnded,
  BadNotStarted,
  BadPerms,
  BadToken,
  GoodAdminSettings,
  GoodAdminSettingsUpdate,
  GoodClientConfigV2,
  Permissions,
} from '@rctf/types'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { invalidateResolvedSettingsCache } from '../../../../apps/api/src/services/settings'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateChallenge,
  generateRealTestUser,
} from '../../util'

const getDb = () => createDatabase(config.database.sql).db

let app: Hono<any>
let settingsAdmin: Awaited<ReturnType<typeof generateRealTestUser>>
let challsAdmin: Awaited<ReturnType<typeof generateRealTestUser>>
let unprivilegedUser: Awaited<ReturnType<typeof generateRealTestUser>>

const cleanupSettings = async () => {
  const db = getDb()
  const redis = await createRedis()
  await db.delete(settings).where(eq(settings.id, 'value-0'))
  await invalidateResolvedSettingsCache(redis)
}

const authHeaders = async (userId: string) => ({
  Authorization: `Bearer ${await generateAuthToken(userId)}`,
})

const jsonHeaders = async (userId: string) => ({
  ...(await authHeaders(userId)),
  'Content-Type': 'application/json',
})

beforeAll(async () => {
  app = await getApp()
  settingsAdmin = await generateRealTestUser(Permissions.settingsWrite)
  challsAdmin = await generateRealTestUser(
    Permissions.challsRead | Permissions.challsWrite
  )
  unprivilegedUser = await generateRealTestUser()
})

afterEach(async () => {
  await cleanupSettings()
})

afterAll(async () => {
  await cleanupSettings()
  await settingsAdmin.cleanup()
  await challsAdmin.cleanup()
  await unprivilegedUser.cleanup()
})

describe('admin settings', () => {
  describe('GET /api/v2/admin/settings', () => {
    test('rejects unauthenticated requests', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'GET',
      })
      await expectResponse(res, BadToken)
    })

    test('rejects users without settingsWrite permission', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'GET',
        headers: await authHeaders(unprivilegedUser.user.id),
      })
      await expectResponse(res, BadPerms)
    })

    test('rejects users with other admin permissions but not settingsWrite', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'GET',
        headers: await authHeaders(challsAdmin.user.id),
      })
      await expectResponse(res, BadPerms)
    })

    test('allows users with settingsWrite permission', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'GET',
        headers: await authHeaders(settingsAdmin.user.id),
      })
      await expectResponse(res, GoodAdminSettings)
    })

    test('allows users with settingsWrite combined with other permissions', async () => {
      const combinedUser = await generateRealTestUser(
        Permissions.settingsWrite | Permissions.challsRead
      )
      try {
        const res = await request(app, '/api/v2/admin/settings', {
          method: 'GET',
          headers: await authHeaders(combinedUser.user.id),
        })
        await expectResponse(res, GoodAdminSettings)
      } finally {
        await combinedUser.cleanup()
      }
    })

    test('returns overrides and defaults', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'GET',
        headers: await authHeaders(settingsAdmin.user.id),
      })
      const body = await expectResponse(res, GoodAdminSettings)
      expect(body.data).toHaveProperty('overrides')
      expect(body.data).toHaveProperty('defaults')
    })

    test('returns empty overrides when no DB settings exist', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'GET',
        headers: await authHeaders(settingsAdmin.user.id),
      })
      const body = await expectResponse(res, GoodAdminSettings)
      expect(body.data.overrides).toEqual({})
    })

    test('returns config file values as defaults', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'GET',
        headers: await authHeaders(settingsAdmin.user.id),
      })
      const body = await expectResponse(res, GoodAdminSettings)
      expect(body.data.defaults.ctfName).toBe(config.ctfName)
      expect(body.data.defaults.homeContent).toBe(config.homeContent)
      expect(body.data.defaults.startTime).toBe(config.startTime)
      expect(body.data.defaults.endTime).toBe(config.endTime)
      expect(body.data.defaults.faviconUrl).toBe(config.faviconUrl)
      expect(body.data.defaults.meta).toEqual(config.meta)
      expect(body.data.defaults.sponsors).toEqual(config.sponsors)
    })

    test('returns stored overrides after update', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: 'Overridden' } }),
      })

      const res = await request(app, '/api/v2/admin/settings', {
        method: 'GET',
        headers: await authHeaders(settingsAdmin.user.id),
      })
      const body = await expectResponse(res, GoodAdminSettings)
      expect(body.data.overrides.ctfName).toBe('Overridden')
      expect(body.data.defaults.ctfName).toBe(config.ctfName)
    })
  })

  describe('PUT /api/v2/admin/settings', () => {
    test('rejects unauthenticated requests', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { ctfName: 'X' } }),
      })
      await expectResponse(res, BadToken)
    })

    test('rejects users without settingsWrite permission', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(unprivilegedUser.user.id),
        body: JSON.stringify({ data: { ctfName: 'X' } }),
      })
      await expectResponse(res, BadPerms)
    })

    test('rejects users with other admin permissions but not settingsWrite', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(challsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: 'X' } }),
      })
      await expectResponse(res, BadPerms)
    })

    test('sets ctfName override', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: 'CustomCTF' } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.ctfName).toBe('CustomCTF')
      expect(body.data.defaults.ctfName).toBe(config.ctfName)
    })

    test('sets homeContent override', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { homeContent: '# Custom Home' } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.homeContent).toBe('# Custom Home')
    })

    test('sets competition timing overrides', async () => {
      const startTime = Date.now() + 60_000
      const endTime = startTime + 3_600_000
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { startTime, endTime } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.startTime).toBe(startTime)
      expect(body.data.overrides.endTime).toBe(endTime)
    })

    test('sets faviconUrl override', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({
          data: { faviconUrl: 'https://example.com/fav.ico' },
        }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.faviconUrl).toBe('https://example.com/fav.ico')
    })

    test('sets meta override', async () => {
      const meta = {
        description: 'Custom desc',
        imageUrl: 'https://img.com/i.png',
      }
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { meta } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.meta).toEqual(meta)
    })

    test('sets meta with only description', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { meta: { description: 'Only desc' } } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.meta!.description).toBe('Only desc')
      expect(body.data.overrides.meta!.imageUrl).toBeUndefined()
    })

    test('sets sponsors override', async () => {
      const sponsors = [
        {
          name: 'Acme',
          icon: 'https://acme.com/logo.png',
          description: 'A sponsor',
        },
        {
          name: 'Beta',
          icon: 'https://beta.com/logo.png',
          description: 'B',
          url: 'https://beta.com',
        },
      ]
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { sponsors } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.sponsors).toEqual(sponsors)
    })

    test('sets empty sponsors array', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { sponsors: [] } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.sponsors).toEqual([])
    })

    test('sets all fields at once', async () => {
      const allFields = {
        ctfName: 'All',
        homeContent: '# All',
        startTime: config.startTime + 1000,
        endTime: config.endTime - 1000,
        faviconUrl: 'all.ico',
        meta: { description: 'All desc', imageUrl: 'all.png' },
        sponsors: [
          { name: 'All Sponsor', icon: 'all.png', description: 'All' },
        ],
      }
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: allFields }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides).toEqual(allFields)
    })

    test('resets a field to default when set to null', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: 'Override' } }),
      })

      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: null } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.ctfName).toBeUndefined()
    })

    test('resets multiple fields to default', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({
          data: { ctfName: 'A', homeContent: 'B', faviconUrl: 'C' },
        }),
      })

      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({
          data: { ctfName: null, homeContent: null, faviconUrl: null },
        }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.ctfName).toBeUndefined()
      expect(body.data.overrides.homeContent).toBeUndefined()
      expect(body.data.overrides.faviconUrl).toBeUndefined()
    })

    test('resets competition timing to defaults', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({
          data: {
            startTime: config.startTime + 1000,
            endTime: config.endTime - 1000,
          },
        }),
      })

      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { startTime: null, endTime: null } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.startTime).toBeUndefined()
      expect(body.data.overrides.endTime).toBeUndefined()
    })

    test('reset does not affect other overridden fields', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({
          data: { ctfName: 'Keep', homeContent: 'Remove' },
        }),
      })

      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { homeContent: null } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.ctfName).toBe('Keep')
      expect(body.data.overrides.homeContent).toBeUndefined()
    })

    test('reset sponsors to default', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({
          data: { sponsors: [{ name: 'X', icon: 'x', description: 'x' }] },
        }),
      })

      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { sponsors: null } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.sponsors).toBeUndefined()
    })

    test('reset meta to default', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { meta: { description: 'Custom' } } }),
      })

      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { meta: null } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.meta).toBeUndefined()
    })

    test('can set some fields and reset others in the same request', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: 'A', homeContent: 'B' } }),
      })

      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({
          data: {
            ctfName: null,
            homeContent: 'Updated',
            faviconUrl: 'new.ico',
          },
        }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.ctfName).toBeUndefined()
      expect(body.data.overrides.homeContent).toBe('Updated')
      expect(body.data.overrides.faviconUrl).toBe('new.ico')
    })

    test('handles empty string values', async () => {
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: '' } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.ctfName).toBe('')
    })

    test('handles many sponsors', async () => {
      const sponsors = Array.from({ length: 20 }, (_, i) => ({
        name: `Sponsor ${i}`,
        icon: `https://example.com/${i}.png`,
        description: `Description ${i}`,
      }))
      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { sponsors } }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.sponsors!).toHaveLength(20)
    })

    test('empty data object is accepted (no-op)', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: 'Before' } }),
      })

      const res = await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: {} }),
      })
      const body = await expectResponse(res, GoodAdminSettingsUpdate)
      expect(body.data.overrides.ctfName).toBe('Before')
    })

    test('settings persist across GET requests', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({
          data: {
            ctfName: 'Persist',
            homeContent: '# Persist',
          },
        }),
      })

      const res = await request(app, '/api/v2/admin/settings', {
        method: 'GET',
        headers: await authHeaders(settingsAdmin.user.id),
      })
      const body = await expectResponse(res, GoodAdminSettings)
      expect(body.data.overrides.ctfName).toBe('Persist')
      expect(body.data.overrides.homeContent).toBe('# Persist')
    })

    test('sequential updates accumulate correctly', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: 'Step1' } }),
      })
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { homeContent: 'Step2' } }),
      })
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { faviconUrl: 'Step3' } }),
      })

      const res = await request(app, '/api/v2/admin/settings', {
        method: 'GET',
        headers: await authHeaders(settingsAdmin.user.id),
      })
      const body = await expectResponse(res, GoodAdminSettings)
      expect(body.data.overrides.ctfName).toBe('Step1')
      expect(body.data.overrides.homeContent).toBe('Step2')
      expect(body.data.overrides.faviconUrl).toBe('Step3')
    })
  })

  describe('client config reflects settings overrides', () => {
    test('v2 client config uses config defaults when no DB overrides', async () => {
      const res = await request(app, '/api/v2/integrations/client/config', {
        method: 'GET',
      })
      const body = await expectResponse(res, GoodClientConfigV2)
      expect(body.data.ctfName).toBe(config.ctfName)
      expect(body.data.homeContent).toBe(config.homeContent)
      expect(body.data.divisions).toEqual(config.divisions)
    })

    test('v2 client config uses DB overrides for ctfName', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: 'OverriddenCTF' } }),
      })

      const res = await request(app, '/api/v2/integrations/client/config', {
        method: 'GET',
      })
      const body = await expectResponse(res, GoodClientConfigV2)
      expect(body.data.ctfName).toBe('OverriddenCTF')
    })

    test('v2 client config uses DB overrides for homeContent', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { homeContent: '# Override Home' } }),
      })

      const res = await request(app, '/api/v2/integrations/client/config', {
        method: 'GET',
      })
      const body = await expectResponse(res, GoodClientConfigV2)
      expect(body.data.homeContent).toBe('# Override Home')
    })

    test('v2 client config uses DB overrides for competition timing', async () => {
      const startTime = config.startTime + 12_345
      const endTime = config.endTime - 54_321

      const before = await request(app, '/api/v2/integrations/client/config', {
        method: 'GET',
      })
      const beforeBody = await expectResponse(before, GoodClientConfigV2)
      expect(beforeBody.data.startTime).toBe(config.startTime)
      expect(beforeBody.data.endTime).toBe(config.endTime)

      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { startTime, endTime } }),
      })

      const res = await request(app, '/api/v2/integrations/client/config', {
        method: 'GET',
      })
      const body = await expectResponse(res, GoodClientConfigV2)
      expect(body.data.startTime).toBe(startTime)
      expect(body.data.endTime).toBe(endTime)
    })

    test('v2 client config uses DB overrides for sponsors', async () => {
      const sponsors = [
        { name: 'TestSponsor', icon: 'test.png', description: 'Test' },
      ]
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { sponsors } }),
      })

      const res = await request(app, '/api/v2/integrations/client/config', {
        method: 'GET',
      })
      const body = await expectResponse(res, GoodClientConfigV2)
      expect(body.data.sponsors).toEqual(sponsors)
    })

    test('v2 client config uses DB overrides for meta', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({
          data: {
            meta: { description: 'Custom meta', imageUrl: 'custom.png' },
          },
        }),
      })

      const res = await request(app, '/api/v2/integrations/client/config', {
        method: 'GET',
      })
      const body = await expectResponse(res, GoodClientConfigV2)
      expect(body.data.meta.description).toBe('Custom meta')
      expect(body.data.meta.imageUrl).toBe('custom.png')
    })

    test('v2 client config uses DB override for faviconUrl', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({
          data: { faviconUrl: 'https://custom.com/fav.ico' },
        }),
      })

      const res = await request(app, '/api/v2/integrations/client/config', {
        method: 'GET',
      })
      const body = await expectResponse(res, GoodClientConfigV2)
      expect(body.data.faviconUrl).toBe('https://custom.com/fav.ico')
    })

    test('v2 client config partial meta override falls back to config defaults', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({
          data: { meta: { description: 'Only desc' } },
        }),
      })

      const res = await request(app, '/api/v2/integrations/client/config', {
        method: 'GET',
      })
      const body = await expectResponse(res, GoodClientConfigV2)
      expect(body.data.meta.description).toBe('Only desc')
      expect(body.data.meta.imageUrl).toBe(config.meta.imageUrl)
    })

    test('v2 client config reverts to defaults after reset', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: 'Temp' } }),
      })

      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: null } }),
      })

      const res = await request(app, '/api/v2/integrations/client/config', {
        method: 'GET',
      })
      const body = await expectResponse(res, GoodClientConfigV2)
      expect(body.data.ctfName).toBe(config.ctfName)
    })

    test('non-overridden fields stay from config file', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: 'OnlyThis' } }),
      })

      const res = await request(app, '/api/v2/integrations/client/config', {
        method: 'GET',
      })
      const body = await expectResponse(res, GoodClientConfigV2)
      expect(body.data.ctfName).toBe('OnlyThis')
      expect(body.data.startTime).toBe(config.startTime)
      expect(body.data.endTime).toBe(config.endTime)
      expect(body.data.origin).toBe(config.origin)
      expect(body.data.userMembers).toBe(config.userMembers)
    })

    test('v1 client config also uses DB overrides', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { ctfName: 'V1Override' } }),
      })

      const res = await request(app, '/api/v1/integrations/client/config', {
        method: 'GET',
      })
      const body = await res.json()
      expect(body.data.ctfName).toBe('V1Override')
    })

    test('v1 client config reverts after reset', async () => {
      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { homeContent: 'V1Home' } }),
      })

      let res = await request(app, '/api/v1/integrations/client/config', {
        method: 'GET',
      })
      let body = await res.json()
      expect(body.data.homeContent).toBe('V1Home')

      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { homeContent: null } }),
      })

      res = await request(app, '/api/v1/integrations/client/config', {
        method: 'GET',
      })
      body = await res.json()
      expect(body.data.homeContent).toBe(config.homeContent)
    })
  })

  describe('runtime timing enforcement', () => {
    test('challenge routes use stored start time overrides', async () => {
      const startTime = Date.now() + 60_000
      const endTime = startTime + 3_600_000

      await request(app, '/api/v2/admin/settings', {
        method: 'PUT',
        headers: await jsonHeaders(settingsAdmin.user.id),
        body: JSON.stringify({ data: { startTime, endTime } }),
      })

      const res = await request(app, '/api/v2/challs', {
        method: 'GET',
      })
      await expectResponse(res, BadNotStarted)
    })

    test('submit routes use stored end time overrides', async () => {
      const { challenge, cleanup } = await generateChallenge()
      try {
        const endTime = Date.now() - 1_000
        const startTime = endTime - 3_600_000

        await request(app, '/api/v2/admin/settings', {
          method: 'PUT',
          headers: await jsonHeaders(settingsAdmin.user.id),
          body: JSON.stringify({ data: { startTime, endTime } }),
        })

        const res = await request(
          app,
          `/api/v1/challs/${encodeURIComponent(challenge.id)}/submit`,
          {
            method: 'POST',
            headers: {
              ...(await jsonHeaders(unprivilegedUser.user.id)),
            },
            body: JSON.stringify({ flag: challenge.flag }),
          }
        )
        await expectResponse(res, BadEnded)
      } finally {
        await cleanup()
      }
    })
  })
})
