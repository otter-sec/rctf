import { config } from '@rctf/config'
import { createDatabase } from '@rctf/db'
import { ALL_PERMISSIONS, Permissions } from '@rctf/types'
import { beforeEach, describe, expect, test } from 'bun:test'
import {
  getCachedUser,
  setCachedUser,
} from '../../../../apps/api/src/cache/auth-cache'
import {
  getAdminUsers,
  setUserPerms,
} from '../../../../apps/api/src/services/users'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { clearDatabase, generateRealTestUser } from '../../util'

const getDb = () => createDatabase(config.database.sql).db

beforeEach(async () => {
  await clearDatabase()
  const redis = await createRedis()
  await redis.flushdb()
})

describe('setUserPerms', () => {
  test('updates perms and returns the updated user', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()

    const updated = await setUserPerms(db, redis, user.id, ALL_PERMISSIONS)

    expect(updated).toBeDefined()
    expect(updated!.id).toBe(user.id)
    expect(updated!.perms).toBe(ALL_PERMISSIONS)
  })

  test('demotes a privileged user back to zero perms', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser(ALL_PERMISSIONS)

    const updated = await setUserPerms(db, redis, user.id, 0)

    expect(updated!.perms).toBe(0)
  })

  test('invalidates the cached user', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()

    await setCachedUser(redis, user)
    expect(await getCachedUser(redis, user.id)).not.toBeNull()

    await setUserPerms(db, redis, user.id, Permissions.challsRead)

    expect(await getCachedUser(redis, user.id)).toBeNull()
  })

  test('returns undefined for an unknown user', async () => {
    const db = getDb()
    const redis = await createRedis()

    const updated = await setUserPerms(
      db,
      redis,
      crypto.randomUUID(),
      ALL_PERMISSIONS
    )

    expect(updated).toBeUndefined()
  })
})

describe('getAdminUsers', () => {
  test('returns only users with perms > 0', async () => {
    const db = getDb()
    await generateRealTestUser()
    const { user: admin } = await generateRealTestUser(ALL_PERMISSIONS)
    const { user: author } = await generateRealTestUser(
      Permissions.challsRead | Permissions.challsWrite
    )

    const admins = await getAdminUsers(db)

    expect(admins).toHaveLength(2)
    expect(admins.map(a => a.id).sort()).toEqual([admin.id, author.id].sort())
  })

  test('returns an empty list when no admins exist', async () => {
    const db = getDb()
    await generateRealTestUser()

    expect(await getAdminUsers(db)).toHaveLength(0)
  })
})
