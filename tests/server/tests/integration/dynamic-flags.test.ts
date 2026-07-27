import { config } from '@rctf/config'
import {
  challenges,
  createDatabase,
  dynamicFlags,
  solves,
  submissions,
  users,
} from '@rctf/db'
import type { ChallengeData } from '@rctf/db'
import {
  BadBody,
  BadFlag,
  GoodAdminChallengeV2,
  GoodChallengeUpdateV2,
  GoodFlag,
  Permissions,
} from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import {
  getFlagsForTeam,
  verifyFlagEntries,
} from '../../../../apps/api/src/providers/flags'
import { deleteChallenge } from '../../../../apps/api/src/services/challenges'
import DynamicFlagProvider, {
  DynamicFlagExhaustion,
  DynamicFlagMode,
} from '../../../../apps/api/src/providers/flags/dynamic'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateRealTestUser,
} from '../../util'

const DYNAMIC_BASE = 'rctf{abcdefghijklmnopqrstuvwxyz}'
const DYNAMIC_MODE = DynamicFlagMode.AUTO
const LEET_BASE = 'rctf{abcdefghijklmnopqrstuvwxyzabcdefghijklmn}'

const getDb = () => createDatabase(config.database.sql).db

type DynamicConfig = {
  base: string
  mode: DynamicFlagMode
}

const defaultDynamicConfig: DynamicConfig = {
  base: DYNAMIC_BASE,
  mode: DYNAMIC_MODE,
}

const mint = async (
  challengeId: string,
  teamId: string,
  dynamicConfig = defaultDynamicConfig
) => {
  const flags = await getFlagsForTeam(
    [
      {
        provider: 'flags/dynamic',
        config: dynamicConfig,
      },
    ],
    { db: getDb(), teamId, challengeId }
  )
  expect(flags).toHaveLength(1)
  return flags[0]!.flag
}

let app: Hono<any>
const challengeCleanups: Array<() => Promise<void>> = []
const userCleanups: Array<() => Promise<void>> = []

const createDynamicChallenge = async (
  dynamicConfig = defaultDynamicConfig,
  id = crypto.randomUUID()
) => {
  const db = getDb()
  const data: ChallengeData = {
    name: crypto.randomUUID(),
    description: crypto.randomUUID(),
    category: crypto.randomUUID(),
    author: crypto.randomUUID(),
    files: [],
    flags: [
      {
        provider: 'flags/dynamic',
        config: dynamicConfig,
      },
    ],
    tiebreakEligible: true,
    points: { min: 100, max: 500 },
  }
  await db.insert(challenges).values({ id, data })
  challengeCleanups.push(async () => {
    await db.delete(submissions).where(eq(submissions.challengeId, id))
    await db.delete(solves).where(eq(solves.challengeid, id))
    await db.delete(dynamicFlags).where(eq(dynamicFlags.challengeId, id))
    await db.delete(challenges).where(eq(challenges.id, id))
  })
  return id
}

const newUser = async (perms = 0) => {
  const { user, cleanup } = await generateRealTestUser(perms)
  userCleanups.push(cleanup)
  return user
}

const submit = async (challengeId: string, userId: string, flag: string) => {
  const authToken = await generateAuthToken(userId)
  return request(
    app,
    `/api/v1/challs/${encodeURIComponent(challengeId)}/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ flag }),
    }
  )
}

beforeAll(async () => {
  app = await getApp()
})

afterAll(async () => {
  for (const cleanup of challengeCleanups) await cleanup()
  for (const cleanup of userCleanups) await cleanup()
})

describe('dynamic flag submission', () => {
  test('accepts the flag minted for the submitting team', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()
    const flag = await mint(challengeId, user.id)

    const res = await submit(challengeId, user.id, flag)
    await expectResponse(res, GoodFlag)
  })

  test('mints a stable flag for the same team and challenge', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()
    expect(await mint(challengeId, user.id)).toBe(
      await mint(challengeId, user.id)
    )
  })

  test('accepts a leet flag with the base shape', async () => {
    const dynamicConfig = {
      base: LEET_BASE,
      mode: DynamicFlagMode.LEET,
    }
    const challengeId = await createDynamicChallenge(dynamicConfig)
    const user = await newUser()
    const flag = await mint(challengeId, user.id, dynamicConfig)

    expect(flag).toHaveLength(LEET_BASE.length)
    expect(flag).not.toBe(LEET_BASE)
    await expectResponse(await submit(challengeId, user.id, flag), GoodFlag)
  })

  test('concurrent mints for the same team settle on a single flag', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()

    const flags = await Promise.all([
      mint(challengeId, user.id),
      mint(challengeId, user.id),
      mint(challengeId, user.id),
      mint(challengeId, user.id),
    ])
    expect(new Set(flags).size).toBe(1)

    const rows = await getDb()
      .select()
      .from(dynamicFlags)
      .where(eq(dynamicFlags.challengeId, challengeId))
    expect(rows).toHaveLength(1)
  })

  test('mints different flags for different teams', async () => {
    const challengeId = await createDynamicChallenge()
    const first = await newUser()
    const second = await newUser()

    expect(await mint(challengeId, first.id)).not.toBe(
      await mint(challengeId, second.id)
    )
  })

  test('a flag minted for one base is rejected for another', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()
    const flag = await mint(challengeId, user.id)

    const rotated = [
      {
        provider: 'flags/dynamic',
        config: { base: LEET_BASE, mode: DYNAMIC_MODE },
      },
    ]
    const { matched } = await verifyFlagEntries(rotated, flag, {
      db: getDb(),
      teamId: user.id,
      challengeId,
    })
    expect(matched).toBeNull()
  })

  test("accepts another team's dynamic flag but records it as cheated", async () => {
    const challengeId = await createDynamicChallenge()
    const owner = await newUser()
    const thief = await newUser()

    const ownerFlag = await mint(challengeId, owner.id)

    const res = await submit(challengeId, thief.id, ownerFlag)
    await expectResponse(res, GoodFlag)

    const thiefSolves = await getDb()
      .select()
      .from(solves)
      .where(eq(solves.userid, thief.id))
    expect(thiefSolves).toHaveLength(1)

    const thiefSubmissions = await getDb()
      .select()
      .from(submissions)
      .where(eq(submissions.userId, thief.id))
    expect(thiefSubmissions).toHaveLength(1)
    expect(thiefSubmissions[0]!.details).toMatchObject({
      cheated: true,
      cheatedFrom: owner.id,
    })
  })

  test('duplicate flags accept every owner and attribute cheats to the earliest', async () => {
    const challengeId = await createDynamicChallenge()
    const first = await newUser()
    const second = await newUser()
    const thief = await newUser()

    const flag = `rctf{dup_${crypto.randomUUID()}}`
    await getDb()
      .insert(dynamicFlags)
      .values([
        {
          challengeId,
          userId: first.id,
          base: DYNAMIC_BASE,
          flag,
          allowDuplicate: true,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          challengeId,
          userId: second.id,
          base: DYNAMIC_BASE,
          flag,
          allowDuplicate: true,
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      ])

    await expectResponse(await submit(challengeId, first.id, flag), GoodFlag)
    await expectResponse(await submit(challengeId, second.id, flag), GoodFlag)
    await expectResponse(await submit(challengeId, thief.id, flag), GoodFlag)

    const thiefSubmissions = await getDb()
      .select()
      .from(submissions)
      .where(eq(submissions.userId, thief.id))
    expect(thiefSubmissions).toHaveLength(1)
    expect(thiefSubmissions[0]!.details).toMatchObject({
      cheated: true,
      cheatedFrom: first.id,
    })
  })

  test('the database rejects a cross-team duplicate outside duplicate mode', async () => {
    const challengeId = crypto.randomUUID()
    const first = await newUser()
    const second = await newUser()
    const db = getDb()
    challengeCleanups.push(async () => {
      await db
        .delete(dynamicFlags)
        .where(eq(dynamicFlags.challengeId, challengeId))
    })

    const flag = `rctf{race_${crypto.randomUUID()}}`
    await db
      .insert(dynamicFlags)
      .values({ challengeId, userId: first.id, base: DYNAMIC_BASE, flag })

    let rejected = false
    try {
      await db
        .insert(dynamicFlags)
        .values({ challengeId, userId: second.id, base: DYNAMIC_BASE, flag })
    } catch {
      rejected = true
    }
    expect(rejected).toBe(true)
  })

  test('rejects a flag minted for another challenge', async () => {
    const ownerChallengeId = await createDynamicChallenge()
    const submittedChallengeId = await createDynamicChallenge()
    const owner = await newUser()
    const thief = await newUser()

    const ownerFlag = await mint(ownerChallengeId, owner.id)
    const res = await submit(submittedChallengeId, thief.id, ownerFlag)
    await expectResponse(res, BadFlag)
  })

  test('deleting a challenge removes its flags, even for a recreated id', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()
    const flag = await mint(challengeId, user.id)

    await deleteChallenge(getDb(), challengeId)
    const rows = await getDb()
      .select()
      .from(dynamicFlags)
      .where(eq(dynamicFlags.challengeId, challengeId))
    expect(rows).toHaveLength(0)

    await createDynamicChallenge(defaultDynamicConfig, challengeId)
    const res = await submit(challengeId, user.id, flag)
    await expectResponse(res, BadFlag)
  })

  test('rejects a minted flag after its owner is deleted', async () => {
    const challengeId = await createDynamicChallenge()
    const owner = await newUser()
    const thief = await newUser()
    const ownerFlag = await mint(challengeId, owner.id)

    await getDb().delete(users).where(eq(users.id, owner.id))
    const res = await submit(challengeId, thief.id, ownerFlag)
    await expectResponse(res, BadFlag)
  })

  test('rejects the untransformed base flag', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()

    const res = await submit(challengeId, user.id, DYNAMIC_BASE)
    await expectResponse(res, BadFlag)
  })

  test('an ordinary wrong guess is not recorded as cheated', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()

    const res = await submit(
      challengeId,
      user.id,
      'rctf{totally-different-body}'
    )
    await expectResponse(res, BadFlag)

    const userSubmissions = await getDb()
      .select()
      .from(submissions)
      .where(eq(submissions.userId, user.id))
    expect(userSubmissions).toHaveLength(1)
    expect(userSubmissions[0]!.details.cheated).toBeUndefined()
  })

  test('lists a dynamic challenge as having a flag', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()
    const authToken = await generateAuthToken(user.id)

    const res = await request(app, '/api/v2/challs', {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const item = body.data.find((c: { id: string }) => c.id === challengeId)
    expect(item).toBeDefined()
    expect(item.hasFlag).toBe(true)
  })
})

describe('dynamic flag exhaustion', () => {
  type InsertTeamFlag = (
    flag: string,
    config: unknown,
    context: unknown,
    allowDuplicate?: boolean
  ) => Promise<string | null>

  const exhaustedProvider = (blocked: (flag: string) => boolean) => {
    const provider = new DynamicFlagProvider()
    const target = provider as unknown as { insertTeamFlag: InsertTeamFlag }
    const original = target.insertTeamFlag.bind(provider) as InsertTeamFlag
    target.insertTeamFlag = (flag, config, context, allowDuplicate) => {
      if (!allowDuplicate && blocked(flag)) {
        return Promise.resolve(null)
      }
      return original(flag, config, context, allowDuplicate)
    }
    return provider
  }

  const newExhaustionContext = async () => {
    const challengeId = crypto.randomUUID()
    const user = await newUser()
    challengeCleanups.push(async () => {
      await getDb()
        .delete(dynamicFlags)
        .where(eq(dynamicFlags.challengeId, challengeId))
    })
    return { db: getDb(), teamId: user.id, challengeId }
  }

  test('falls back to tail once every leet variant is taken', async () => {
    const context = await newExhaustionContext()
    const provider = exhaustedProvider(flag => flag.length === LEET_BASE.length)

    const flag = await provider.getForTeam(
      { base: LEET_BASE, mode: DynamicFlagMode.LEET },
      context
    )
    expect(flag).toMatch(/_[0-9a-f]{10}\}$/)
  })

  test('assigns a duplicate leet flag when configured', async () => {
    const context = await newExhaustionContext()
    const provider = exhaustedProvider(() => true)

    const flag = await provider.getForTeam(
      {
        base: LEET_BASE,
        mode: DynamicFlagMode.LEET,
        exhaustion: DynamicFlagExhaustion.DUPLICATE,
      },
      context
    )
    expect(flag).toHaveLength(LEET_BASE.length)

    const rows = await getDb()
      .select()
      .from(dynamicFlags)
      .where(eq(dynamicFlags.challengeId, context.challengeId))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.flag).toBe(flag!)
  })

  test('returns no flag at exhaustion when duplicates are not allowed', async () => {
    const context = await newExhaustionContext()
    const provider = exhaustedProvider(() => true)

    const flag = await provider.getForTeam(
      { base: LEET_BASE, mode: DynamicFlagMode.LEET },
      context
    )
    expect(flag).toBeNull()
  })
})

describe('admin dynamic flag configuration', () => {
  const adminPerms = Permissions.challsRead | Permissions.challsWrite

  test('rejects forced leet mode when the base has fewer than 20 carriers', async () => {
    const admin = await newUser(adminPerms)
    const authToken = await generateAuthToken(admin.id)
    const challengeId = crypto.randomUUID()

    const res = await request(app, `/api/v2/admin/challs/${challengeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        data: {
          name: 'Undersized Dynamic Challenge',
          description: 'desc',
          category: 'misc',
          author: 'tester',
          flags: [
            {
              provider: 'flags/dynamic',
              config: { base: 'rctf{tiny}', mode: DynamicFlagMode.LEET },
            },
          ],
          points: { min: 100, max: 500 },
        },
      }),
    })

    const body = await expectResponse(res, BadBody)
    expect(body.data.reason).toContain(
      'Leet mode requires at least 20 encodable characters'
    )
  })

  test('persists and reads back a flags/dynamic entry, and clears it', async () => {
    const admin = await newUser(adminPerms)
    const authToken = await generateAuthToken(admin.id)
    const challengeId = crypto.randomUUID()

    const db = getDb()
    challengeCleanups.push(async () => {
      await db.delete(solves).where(eq(solves.challengeid, challengeId))
      await db.delete(challenges).where(eq(challenges.id, challengeId))
    })

    // Create with a dynamic flag config.
    let res = await request(app, `/api/v2/admin/challs/${challengeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        data: {
          name: 'Dynamic Challenge',
          description: 'desc',
          category: 'misc',
          author: 'tester',
          flags: [
            {
              provider: 'flags/dynamic',
              config: { base: DYNAMIC_BASE, mode: DYNAMIC_MODE },
            },
          ],
          points: { min: 100, max: 500 },
        },
      }),
    })
    let body = await expectResponse(res, GoodChallengeUpdateV2)
    expect(body.data.flags).toEqual([
      {
        provider: 'flags/dynamic',
        config: {
          base: DYNAMIC_BASE,
          mode: DYNAMIC_MODE,
          exhaustion: DynamicFlagExhaustion.TAIL,
        },
      },
    ])

    // Read it back through the admin GET route.
    res = await request(app, `/api/v2/admin/challs/${challengeId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    body = await expectResponse(res, GoodAdminChallengeV2)
    expect(body.data.flags[0]!.config.base).toBe(DYNAMIC_BASE)

    // Clearing the entries drops the dynamic config.
    res = await request(app, `/api/v2/admin/challs/${challengeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: { flags: [] } }),
    })
    body = await expectResponse(res, GoodChallengeUpdateV2)
    expect(body.data.flags).toEqual([])
  })
})
