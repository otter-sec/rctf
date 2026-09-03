import type { Challenge, DatabaseClient, User } from '@rctf/db'
import type {
  InstanceQueryOptions,
  instanceDetailsOrError,
  InstancerProvider,
} from '../providers/instancer/base'
import { inferChallengeIntegrationId } from '../util/instancer'
import {
  buildCreateInstanceOptions,
  filterInstanceEndpoints,
  getInstancerChallenge,
  returnInstanceStatusOrError,
  type InstancerResponseHelpers,
} from './instancer'

export interface InstanceRequest {
  res: InstancerResponseHelpers
  db: DatabaseClient
  user: User
  challengeId: string
  includeHidden?: boolean
}

type InstanceResponse = ReturnType<
  InstancerResponseHelpers[keyof InstancerResponseHelpers]
>

const instancerError = (message: string): instanceDetailsOrError => ({
  kind: 'instancerError',
  message,
})

const instanceQueryOptions = (
  user: User,
  challenge: Challenge
): InstanceQueryOptions => ({
  teamId: user.id,
  challengeIntegrationId: inferChallengeIntegrationId(challenge),
  config: challenge.data.instancerConfig!.config,
})

const withInstancerChallenge = async (
  { res, db, challengeId, includeHidden }: InstanceRequest,
  run: (
    challenge: Challenge,
    provider: InstancerProvider
  ) => Promise<instanceDetailsOrError>
): Promise<InstanceResponse> => {
  const { challenge, provider, error } = await getInstancerChallenge(
    res,
    db,
    challengeId,
    { includeHidden }
  )
  if (error) {
    return error
  }

  const instanceStatus = await run(challenge, provider)
  return await returnInstanceStatusOrError(
    res,
    filterInstanceEndpoints(instanceStatus, challenge)
  )
}

export const getInstanceStatus = (
  request: InstanceRequest
): Promise<InstanceResponse> =>
  withInstancerChallenge(request, (challenge, provider) =>
    provider.getInstance(instanceQueryOptions(request.user, challenge))
  )

export const createInstance = (
  request: InstanceRequest
): Promise<InstanceResponse> =>
  withInstancerChallenge(request, async (challenge, provider) =>
    provider.createInstance(
      await buildCreateInstanceOptions(request.db, challenge, request.user)
    )
  )

export const deleteInstance = (
  request: InstanceRequest
): Promise<InstanceResponse> =>
  withInstancerChallenge(request, async (challenge, provider) => {
    if (!provider.capabilities.canStop) {
      return instancerError('Stopping is disabled for this instancer')
    }

    return await provider.deleteInstance(
      instanceQueryOptions(request.user, challenge)
    )
  })

export const extendInstance = (
  request: InstanceRequest
): Promise<InstanceResponse> =>
  withInstancerChallenge(request, async (challenge, provider) => {
    if (!provider.capabilities.canExtend) {
      return instancerError('Extending is disabled for this instancer')
    }

    const instancerConfig = challenge.data.instancerConfig!
    if (instancerConfig.extendable === false) {
      return instancerError('Extending is disabled for this challenge')
    }

    return await provider.extendInstance({
      ...instanceQueryOptions(request.user, challenge),
      timeoutMilliseconds: instancerConfig.timeoutMilliseconds,
    })
  })
