import {
  adminBotJobs,
  challenges,
  settings,
  solves,
  submissions,
  userMembers,
  users,
  type DatabaseClient,
} from '@rctf/db'
import type { SeedData } from './data'

export async function resetAndSeedDatabase(db: DatabaseClient, data: SeedData) {
  await db.transaction(async tx => {
    await tx.delete(adminBotJobs)
    await tx.delete(submissions)
    await tx.delete(solves)
    await tx.delete(userMembers)
    await tx.delete(challenges)
    await tx.delete(users)
    await tx.delete(settings)

    await tx.insert(users).values(data.users)
    if (data.members.length > 0) {
      await tx.insert(userMembers).values(data.members)
    }
    await tx.insert(challenges).values(data.challenges)
    if (data.solves.length > 0) {
      await tx.insert(solves).values(data.solves)
    }
    if (data.submissions.length > 0) {
      await tx.insert(submissions).values(data.submissions)
    }
    await tx.insert(settings).values(data.settings)
  })
}
