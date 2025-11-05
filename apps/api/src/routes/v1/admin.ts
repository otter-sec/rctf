import {
  DeleteChallengeRoute,
  GetAdminChallengeRoute,
  GetAdminChallengesRoute,
  QueryUploadsRoute,
  UpdateChallengeRoute,
  UploadFilesRoute,
} from '@rctf/types'

import { createRouterGroup } from '../../lib/route-module'

const group = createRouterGroup()
export default group

const exampleAdminChallenge = {
  id: 'chal-1',
  name: 'Warmup',
  description: 'Test description',
  category: 'misc',
  author: 'es3n1n',
  files: [
    {
      name: 'challenge.txt',
      url: 'https://google.com/',
    },
  ],
  points: { min: 100, max: 500 },
  flag: 'rctf{example}',
  tiebreakEligible: true,
  sortWeight: 0,
}

group.declareRouter(GetAdminChallengesRoute, async ({ res }) => {
  return res.goodAdminChallenges([exampleAdminChallenge])
})

group.declareRouter(GetAdminChallengeRoute, async ({ res }) => {
  return res.goodAdminChallenge(exampleAdminChallenge)
})

group.declareRouter(UpdateChallengeRoute, async ({ res }) => {
  return res.goodChallengeUpdate(exampleAdminChallenge)
})

group.declareRouter(DeleteChallengeRoute, async ({ res }) => {
  return res.goodChallengeDelete()
})

group.declareRouter(UploadFilesRoute, async ({ res }) => {
  return res.goodFilesUpload([
    {
      name: 'challenge.txt',
      url: 'https://google.com/',
    },
  ])
})

group.declareRouter(QueryUploadsRoute, async ({ res }) => {
  return res.goodUploadsQuery([
    {
      sha256: 'deadbeef',
      name: 'challenge.txt',
      url: 'https://google.com/',
    },
  ])
})
