import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import type {
  BadBody,
  BadChallenge,
  GoodChallengeSolvesV2,
  ResponseHelpers,
} from '@rctf/types'
import { getChallengeSolvesWithPosition } from './challenges'

type ChallengeSolvesResponseHelpers = ResponseHelpers<
  [typeof GoodChallengeSolvesV2, typeof BadChallenge, typeof BadBody]
>

export interface ChallengeSolvesRequest {
  res: ChallengeSolvesResponseHelpers
  db: DatabaseClient
  challengeId: string
  userId: string | null
  limit: number
  offset: number
  includeHidden?: boolean
}

export const getChallengeSolvesResponse = async ({
  res,
  db,
  challengeId,
  userId,
  limit,
  offset,
  includeHidden,
}: ChallengeSolvesRequest): Promise<
  ReturnType<
    ChallengeSolvesResponseHelpers[keyof ChallengeSolvesResponseHelpers]
  >
> => {
  if (
    limit > config.leaderboard.maxLimit ||
    offset > config.leaderboard.maxOffset
  ) {
    return res.badBody({
      reason: 'Invalid limit or offset',
    })
  }

  const { challengeExists, solves, solvePosition, total } =
    await getChallengeSolvesWithPosition(
      db,
      challengeId,
      userId,
      limit,
      offset,
      { includeHidden }
    )

  if (!challengeExists) {
    return res.badChallenge()
  }

  return res.goodChallengeSolvesV2({
    solves: solves.map(solve => ({
      ...solve,
      createdAt: new Date(solve.createdAt).getTime(),
    })),
    mySolvePosition: solvePosition,
    total,
  })
}
