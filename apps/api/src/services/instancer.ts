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
import {
  defaultInstancerName,
  instancerEnabled,
  instancers,
} from '../providers'
import {
  type instanceDetailsOrError,
  type InstancerProvider,
} from '../providers/instancer/base'
import { getChallenge } from './challenges'

export const resolveInstancerName = (
  instancerConfig?: { instancer?: string } | null
): string | undefined => instancerConfig?.instancer ?? defaultInstancerName

export const getInstancerProvider = (
  name: string | undefined
): InstancerProvider | undefined =>
  name === undefined ? undefined : instancers[name]

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
      provider: InstancerProvider
      error?: undefined
    }
  | {
      challenge?: undefined
      provider?: undefined
      error: ReturnType<
        InstancerResponseHelpers[keyof InstancerResponseHelpers]
      >
    }
> => {
  if (!instancerEnabled) {
    return { error: res.badEndpoint() }
  }

  const challenge = await getChallenge(db, challengeId)
  if (!challenge) {
    return { error: res.badChallenge() }
  }

  if (!challenge.data.instancerConfig) {
    return {
      error: res.badInstancerError({
        message: 'Challenge is not configured for instancer',
      }),
    }
  }

  const name = resolveInstancerName(challenge.data.instancerConfig)
  const provider = getInstancerProvider(name)
  if (!provider) {
    return {
      error: res.badInstancerError({
        message: `Instancer "${name ?? 'default'}" is not available`,
      }),
    }
  }

  return { challenge, provider }
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
