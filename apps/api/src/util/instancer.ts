import type { Challenge } from '@rctf/db'

export const inferChallengeIntegrationId = (challenge: Challenge): string => {
  const integrationId = challenge.data.instancerConfig?.challengeIntegrationId
  if (integrationId && integrationId.length > 0) {
    return integrationId
  }

  return challenge.id
}
