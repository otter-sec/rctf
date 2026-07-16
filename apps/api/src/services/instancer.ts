import { config } from '@rctf/config'
import type { Challenge, DatabaseClient, User } from '@rctf/db'
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
import { generateDynamicFlag } from '../providers/flags'
import {
  type CreateInstanceOptions,
  type instanceDetailsOrError,
  type InstancerActionDefinition,
  type InstancerCapabilities,
  type InstancerProvider,
} from '../providers/instancer/base'
import { getChallenge } from './challenges'
import { inferChallengeIntegrationId } from '../util/instancer'

export const resolveInstancerName = (
  instancerConfig?: { instancer?: string } | null,
  fallbackConfig?: { instancer?: string } | null
): string | undefined =>
  instancerConfig?.instancer ??
  fallbackConfig?.instancer ??
  defaultInstancerName

export const getInstancerProvider = (
  name: string | undefined
): InstancerProvider | undefined =>
  name === undefined ? undefined : instancers[name]

const DEFAULT_INSTANCER_CAPABILITIES: InstancerCapabilities = {
  canStop: true,
  canExtend: true,
}

export const resolveInstancerCapabilities = (
  instancerConfig?: { instancer?: string } | null
): InstancerCapabilities =>
  getInstancerProvider(resolveInstancerName(instancerConfig))?.capabilities ??
  DEFAULT_INSTANCER_CAPABILITIES

export const resolveInstancerActions = (
  instancerConfig?: { instancer?: string } | null
): InstancerActionDefinition[] =>
  getInstancerProvider(resolveInstancerName(instancerConfig))?.actions ?? []

type InstancerResponseHelpers = ResponseHelpers<
  [
    typeof GoodInstanceStatus,
    typeof BadInstancerError,
    typeof BadEndpoint,
    typeof BadChallenge,
  ]
>

type InstancerChallengeErrors = ResponseHelpers<
  [typeof BadInstancerError, typeof BadEndpoint, typeof BadChallenge]
>

export const getInstancerChallenge = async (
  res: InstancerChallengeErrors,
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
        InstancerChallengeErrors[keyof InstancerChallengeErrors]
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

// Builds the options handed to a provider's createInstance. For dynamic-flag
// challenges, mints the per-team signed flag here (generically, for every
// provider) so the instance can deliver it to the team.
export const buildCreateInstanceOptions = (
  challenge: Challenge,
  user: User
): CreateInstanceOptions => {
  const dynamic = challenge.data.flags?.dynamic
  return {
    user,
    ...challenge.data.instancerConfig!,
    challengeIntegrationId: inferChallengeIntegrationId(challenge),
    // Deliver the per-team signed flag for dynamic challenges, otherwise the
    // static flag; undefined when the challenge has no flag at all.
    flag: dynamic
      ? generateDynamicFlag(
          dynamic.base,
          user.id,
          challenge.id,
          dynamic.mode,
          config.dynamicFlagSigningKey ?? ''
        )
      : challenge.data.flag || undefined,
  }
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

  if (!instanceStatus.endpoints) {
    return instanceStatus
  }

  const expose = challenge.data.instancerConfig?.expose

  // NOTE(es3n1n): Providers are guaranteed to return endpoints in the same order as the expose config
  // TODO(es3n1n): this is really really really bad, we should rewrite this
  instanceStatus.endpoints = instanceStatus.endpoints.reduce<
    z.output<typeof EndpointSchema>[]
  >((acc, endpoint) => {
    if (endpoint.bypassExpose) {
      acc.push(endpoint)
      return acc
    }

    const nonBypassSoFar = instanceStatus
      .endpoints!.slice(0, instanceStatus.endpoints!.indexOf(endpoint))
      .filter(e => !e.bypassExpose).length
    const exposeConfig = expose?.[nonBypassSoFar]
    if (exposeConfig?.shouldDisplay) {
      acc.push({
        ...endpoint,
        title: exposeConfig.title,
      })
    }

    return acc
  }, [])

  return instanceStatus
}
