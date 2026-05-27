import {
  adminBotJobs,
  challenges,
  scoreEvents,
  settings,
  solves,
  submissions,
  userMembers,
  users,
  type DatabaseClient,
} from '@rctf/db'
import type { SeedData } from './data'

const INSERT_CHUNK_SIZE = 1_000

async function insertInChunks<T>(
  values: T[],
  insert: (chunk: T[]) => Promise<void>
) {
  for (let index = 0; index < values.length; index += INSERT_CHUNK_SIZE) {
    await insert(values.slice(index, index + INSERT_CHUNK_SIZE))
  }
}

export async function resetAndSeedDatabase(db: DatabaseClient, data: SeedData) {
  await db.transaction(async tx => {
    await tx.delete(adminBotJobs)
    await tx.delete(scoreEvents)
    await tx.delete(submissions)
    await tx.delete(solves)
    await tx.delete(userMembers)
    await tx.delete(challenges)
    await tx.delete(users)
    await tx.delete(settings)

    await insertInChunks(data.users, async chunk => {
      await tx.insert(users).values(chunk)
    })
    if (data.members.length > 0) {
      await insertInChunks(data.members, async chunk => {
        await tx.insert(userMembers).values(chunk)
      })
    }
    await tx.insert(challenges).values(data.challenges)
    if (data.solves.length > 0) {
      await insertInChunks(data.solves, async chunk => {
        await tx.insert(solves).values(chunk)
      })
    }
    if (data.scoreEvents.length > 0) {
      await insertInChunks(data.scoreEvents, async chunk => {
        await tx.insert(scoreEvents).values(chunk)
      })
    }
    if (data.submissions.length > 0) {
      await insertInChunks(data.submissions, async chunk => {
        await tx.insert(submissions).values(chunk)
      })
    }
    await tx.insert(settings).values(data.settings)
  })
}
