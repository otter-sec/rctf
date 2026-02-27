import { afterAll, beforeAll, describe, test } from 'bun:test'
import { config } from '@rctf/config'
import { createDatabase, users } from '@rctf/db'
import { BadEmailChangeDivision, GoodEmailSet } from '@rctf/types'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { compiledACLs } from '../../../../apps/api/src/util/acl'
import { getApp, request } from '../../app'
import { expectResponse, generateAuthToken } from '../../util'

let app: Hono<any>
let oldEmail: typeof config.email
let oldCtftime: typeof config.ctftime
let oldDivisionACLs: typeof config.divisionACLs
let savedACLs: (typeof compiledACLs)[number][]

const getDb = () => createDatabase(config.database.sql).db
const cleanups: Array<() => Promise<void>> = []

const createTestUserInDivision = async (
  division: string,
  emailDomain: string
) => {
  const db = getDb()
  const id = crypto.randomUUID()
  const email = `${crypto.randomUUID()}@${emailDomain}`
  const name = crypto.randomUUID()

  const [user] = await db
    .insert(users)
    .values({ id, email, name, division, perms: 0 })
    .returning()

  cleanups.push(async () => {
    await db.delete(users).where(eq(users.id, id))
  })

  return user!
}

const enableACLs = () => {
  config.email = {
    provider: {
      name: 'emails/smtp',
      options: { smtpUrl: 'smtp://example.com' },
    },
    from: 'no-reply@example.com',
  }
  config.ctftime = undefined
  config.divisionACLs = [
    {
      match: 'domain',
      value: 'allowed.test',
      divisions: ['hs', 'college', 'other'],
    },
    { match: 'domain', value: 'college.test', divisions: ['college'] },
    { match: 'domain', value: 'hs.test', divisions: ['hs'] },
  ]

  compiledACLs.length = 0
  compiledACLs.push(
    {
      check: (email: string | undefined) =>
        email?.endsWith('@allowed.test') ?? false,
      divisions: ['hs', 'college', 'other'],
    },
    {
      check: (email: string | undefined) =>
        email?.endsWith('@college.test') ?? false,
      divisions: ['college'],
    },
    {
      check: (email: string | undefined) =>
        email?.endsWith('@hs.test') ?? false,
      divisions: ['hs'],
    }
  )
}

beforeAll(async () => {
  app = await getApp()

  oldEmail = config.email
  oldCtftime = config.ctftime
  oldDivisionACLs = config.divisionACLs
  savedACLs = [...compiledACLs]
})

afterAll(async () => {
  config.email = oldEmail
  config.ctftime = oldCtftime
  config.divisionACLs = oldDivisionACLs

  compiledACLs.length = 0
  compiledACLs.push(...savedACLs)

  for (const cleanup of cleanups) {
    await cleanup()
  }
})

describe('email change division check', () => {
  describe('v1 set-email rejects non-qualifying email', () => {
    test('user in hs cannot change to college-only email', async () => {
      enableACLs()

      const user = await createTestUserInDivision('hs', 'allowed.test')
      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v1/users/me/auth/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: `${crypto.randomUUID()}@college.test`,
        }),
      })

      await expectResponse(res, BadEmailChangeDivision)
    })

    test('user in college cannot change to hs-only email', async () => {
      enableACLs()

      const user = await createTestUserInDivision('college', 'college.test')
      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v1/users/me/auth/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: `${crypto.randomUUID()}@hs.test`,
        }),
      })

      await expectResponse(res, BadEmailChangeDivision)
    })

    test('rejects email from unrecognized domain', async () => {
      enableACLs()

      const user = await createTestUserInDivision('hs', 'allowed.test')
      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v1/users/me/auth/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: `${crypto.randomUUID()}@unknown.test`,
        }),
      })

      await expectResponse(res, BadEmailChangeDivision)
    })
  })

  describe('v1 set-email without email verification', () => {
    test('direct email update succeeds when no ACLs configured', async () => {
      config.email = undefined
      config.ctftime = undefined
      config.divisionACLs = undefined

      compiledACLs.length = 0
      compiledACLs.push(...savedACLs)

      const user = await createTestUserInDivision('hs', 'allowed.test')
      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v1/users/me/auth/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: `${crypto.randomUUID()}@anything.test`,
        }),
      })

      await expectResponse(res, GoodEmailSet)
    })
  })

  describe('v2 set-email rejects non-qualifying email', () => {
    test('user in college cannot change to hs-only email', async () => {
      enableACLs()

      const user = await createTestUserInDivision('college', 'college.test')
      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v2/users/me/auth/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: `${crypto.randomUUID()}@hs.test`,
        }),
      })

      await expectResponse(res, BadEmailChangeDivision)
    })

    test('rejects email from unrecognized domain', async () => {
      enableACLs()

      const user = await createTestUserInDivision('other', 'allowed.test')
      const authToken = await generateAuthToken(user.id)

      const res = await request(app, '/api/v2/users/me/auth/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: `${crypto.randomUUID()}@unknown.test`,
        }),
      })

      await expectResponse(res, BadEmailChangeDivision)
    })
  })
})
