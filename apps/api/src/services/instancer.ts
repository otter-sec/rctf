import { config } from '@rctf/config'
import type { Challenge, DatabaseClient } from '@rctf/db'
import type {
  BadChallenge,
  BadEndpoint,
  BadInstancerError,
  EndpointSchema,
  GoodInstanceStatus,
  ResponseHelpers,
} from '@rctf/types'
import { z } from 'zod/mini'
import { type instanceDetailsOrError } from '../providers/instancer/base'
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
  if (instanceStatus.kind === 'instancerError') {
    return res.badInstancerError(instanceStatus)
  }
  return res.goodInstanceStatus(instanceStatus)
}

export const filterInstanceEndpoints = (
  instanceStatus: instanceDetailsOrError,
  challenge: Challenge
): instanceDetailsOrError => {
  if (instanceStatus.kind !== 'instancerInstanceDetails') {
    return instanceStatus
  }

  if (!instanceStatus.endpoints || !challenge.data.instancerConfig?.expose) {
    return instanceStatus
  }

  // NOTE(es3n1n): Providers are guaranteed to return endpoints in the same order as the expose config
  instanceStatus.endpoints =
    (instanceStatus.endpoints
      .map((endpoint, i) => {
        const exposeConfig = challenge.data.instancerConfig?.expose?.[i]
        if (!exposeConfig?.shouldDisplay) {
          return undefined
        }

        return {
          ...endpoint,
          title: exposeConfig.title,
        }
      })
      .filter(endpoint => Boolean(endpoint)) as z.output<
      typeof EndpointSchema
    >[]) ?? null

  return instanceStatus
}
