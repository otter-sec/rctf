import { config } from '@rctf/config'
import { challenges, createDatabase, type ChallengeData } from '@rctf/db'
import { GoodFlag } from '@rctf/types'
import { expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { PinoLogger } from 'hono-pino'
import { getFlagsForTeam } from '../../../../apps/api/src/providers/flags'
import { submitFlag } from '../../../../apps/api/src/services/challenges'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { generateRealTestUser } from '../../util'

const getDb = () => createDatabase(config.database.sql).db

test('does not include submitted flags in successful or cheated logs', async () => {
  const db = getDb()
  const redis = await createRedis()
  const owner = await generateRealTestUser()
  const submitter = await generateRealTestUser()
  const challengeId = crypto.randomUUID()
  const flagEntry = {
    provider: 'flags/dynamic',
    config: { base: 'rctf{abcdefghijklmnopqrstuvwxyz}', mode: 'auto' },
  }
  const challengeData: ChallengeData = {
    name: 'Sensitive logging test',
    description: '',
    category: 'misc',
    author: 'test',
    files: [],
    flags: [flagEntry],
    tiebreakEligible: true,
    points: { min: 100, max: 500 },
  }
  await db.insert(challenges).values({ id: challengeId, data: challengeData })

  const captured: Array<{ level: string; args: unknown[] }> = []
  const capture =
    (level: string) =>
    (...args: unknown[]) => {
      captured.push({ level, args })
    }
  const logger = {
    info: capture('info'),
    warn: capture('warn'),
    error: capture('error'),
  } as unknown as PinoLogger
  // Return the selected response helper name as its response kind.
  const responses = new Proxy(Object.create(null), {
    get: (_target, property) => (data?: unknown) => ({
      status: 200,
      body: { kind: property, data },
      definition: {},
    }),
  }) as Parameters<typeof submitFlag>[0]

  try {
    const [minted] = await getFlagsForTeam([flagEntry], {
      db,
      teamId: owner.user.id,
      challengeId,
    })
    const secretFlag = minted!.flag

    const ownerResult = await submitFlag(responses, db, redis, logger, {
      userId: owner.user.id,
      challengeId,
      flag: secretFlag,
      submissionIp: '127.0.0.1',
    })
    const cheatedResult = await submitFlag(responses, db, redis, logger, {
      userId: submitter.user.id,
      challengeId,
      flag: secretFlag,
      submissionIp: '127.0.0.1',
    })

    expect(ownerResult.body.kind).toBe(GoodFlag.kind)
    expect(cheatedResult.body.kind).toBe(GoodFlag.kind)
    expect(captured.some(entry => entry.level === 'warn')).toBe(true)
    expect(JSON.stringify(captured)).not.toContain(secretFlag)
  } finally {
    await owner.cleanup()
    await submitter.cleanup()
    await db.delete(challenges).where(eq(challenges.id, challengeId))
  }
})
