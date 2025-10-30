import { challsGet } from '@rctf/api-types/routes'
import { makeFastifyRoute } from '../helpers'
import config from '../../config/server'
import { getCleanedChallenges } from '../../challenges'
import { getChallengeInfo } from '../../cache/leaderboard'
import Permissions from '../../util/perms'

export default makeFastifyRoute(challsGet, async ({ res, user }) => {
  if (Date.now() < config.startTime && !(user.perms & Permissions.challsRead)) {
    return res.badNotStarted()
  }

  const cleaned = getCleanedChallenges()
  const challengeInfo = await getChallengeInfo({
    ids: cleaned.map(chall => chall.id),
  })

  return res.goodChallenges(
    cleaned.map((chall, i) => ({
      ...chall,
      points: challengeInfo[i].score ?? undefined,
      solves: challengeInfo[i].solves ?? undefined,
    }))
  )
})
