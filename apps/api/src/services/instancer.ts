import { config } from '@rctf/config'
import type { Challenge, DatabaseClient } from '@rctf/db'
import type {
  BadChallenge,
  BadEndpoint,
  BadInstancerError,
  GoodInstanceStatus,
  ResponseHelpers,
} from '@rctf/types'
import {
  instancerErrorSchema,
  type instanceDetailsOrError,
} from '../providers/instancer/base'
import { getChallenge } from './challenges'

type InstancerResponseHelpers = ResponseHelpers<
  [
    typeof GoodInstanceStatus,
    typeof BadInstancerError,
    typeof BadEndpoint,
    typeof BadChallenge,
  ]
>

export const getInstancerChallenge = async (
  res: InstancerResponseHelpers,
  db: DatabaseClient,
  challengeId: string
): Promise<
  | {
      challenge: Challenge
      error?: undefined
    }
  | {
      challenge?: undefined
      error: ReturnType<
        InstancerResponseHelpers[keyof InstancerResponseHelpers]
      >
    }
> => {
  if (!config.instancerProvider) {
    return { error: res.badEndpoint() }
  }

  const challenge = await getChallenge(db, challengeId)
  if (!challenge) {
    return { error: res.badChallenge() }
  }

  if (!challenge.data.instancerConfig?.challengeIntegrationId) {
    return {
      error: res.badInstancerError({
        message: 'Challenge is not configured for instancer',
      }),
    }
  }

  return { challenge }
}

export const returnInstanceStatusOrError = async (
  res: InstancerResponseHelpers,
  instanceStatus: instanceDetailsOrError
): Promise<
  ReturnType<InstancerResponseHelpers[keyof InstancerResponseHelpers]>
> => {
  if (instanceStatus.kind === instancerErrorSchema.shape.kind.value) {
    return res.badInstancerError(instanceStatus)
  }
  return res.goodInstanceStatus(instanceStatus)
}
