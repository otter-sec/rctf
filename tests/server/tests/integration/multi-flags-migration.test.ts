import { join } from 'node:path'
import { config } from '@rctf/config'
import { challenges, createDatabase, type ChallengeData } from '@rctf/db'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'

const getDb = () => createDatabase(config.database.sql).db

const MIGRATION_PATH = join(
  import.meta.dir,
  '../../../../packages/db/migrations/0026_multi_flags.sql'
)

let migrationSql: string
const createdChallengeIds: string[] = []

const insertRaw = async (data: Record<string, unknown>): Promise<string> => {
  const db = getDb()
  const id = crypto.randomUUID()
  await db
    .insert(challenges)
    .values({ id, data: data as unknown as ChallengeData })
  createdChallengeIds.push(id)
  return id
}

const getData = async (id: string): Promise<Record<string, unknown>> => {
  const db = getDb()
  const [row] = await db
    .select({ data: challenges.data })
    .from(challenges)
    .where(eq(challenges.id, id))
    .limit(1)
  return row!.data as unknown as Record<string, unknown>
}

const runMigration = async () => {
  const db = getDb()
  await db.execute(sql.raw(migrationSql))
}

beforeAll(async () => {
  migrationSql = await Bun.file(MIGRATION_PATH).text()
})

afterAll(async () => {
  const db = getDb()
  for (const id of createdChallengeIds) {
    await db.delete(challenges).where(eq(challenges.id, id))
  }
})

const legacyBase = {
  name: 'legacy',
  description: '',
  category: 'misc',
  author: 'test',
  files: [],
  points: { min: 100, max: 500 },
  tiebreakEligible: true,
}

describe('0026_multi_flags migration', () => {
  test('converts a legacy flag into one static entry, preserved exactly', async () => {
    const tricky = 'flag{"quo\\ted"__éß字}'
    const simple = await insertRaw({ ...legacyBase, flag: 'flag{legacy}' })
    const special = await insertRaw({ ...legacyBase, flag: tricky })
    await runMigration()

    const simpleData = await getData(simple)
    expect(simpleData.flags).toEqual([
      { provider: 'flags/static', config: { flag: 'flag{legacy}' } },
    ])
    expect(simpleData).not.toHaveProperty('flag')

    const specialData = await getData(special)
    expect(specialData.flags).toEqual([
      { provider: 'flags/static', config: { flag: tricky } },
    ])
  })

  test('converts an empty or missing legacy flag into an empty list', async () => {
    const empty = await insertRaw({ ...legacyBase, flag: '' })
    const missing = await insertRaw({ ...legacyBase })
    await runMigration()

    const emptyData = await getData(empty)
    expect(emptyData.flags).toEqual([])
    expect(emptyData).not.toHaveProperty('flag')
    expect((await getData(missing)).flags).toEqual([])
  })

  test('is idempotent and leaves migrated rows untouched', async () => {
    const migrated = {
      ...legacyBase,
      flags: [
        { provider: 'flags/static', config: { flag: 'flag{a}' } },
        { provider: 'flags/static', config: { flag: 'flag{b}' } },
      ],
    }
    const id = await insertRaw(migrated)
    await runMigration()
    await runMigration()

    const data = await getData(id)
    expect(data.flags).toEqual(migrated.flags)
  })
})
