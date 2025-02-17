import { Challenge } from './types'
import { deepCopy } from '../util/object'

const ChallengeDefaults: Challenge = {
  id: '',
  name: '',
  description: '',
  category: '',
  author: '',
  files: [],
  tiebreakEligible: true,
  points: {
    min: 0,
    max: 0,
  },
  flag: '',
}

export const applyChallengeDefaults = (
  chall: Partial<Challenge>
): Challenge => {
  const copy = deepCopy(ChallengeDefaults)

  return {
    ...copy,
    ...chall,
  }
}
