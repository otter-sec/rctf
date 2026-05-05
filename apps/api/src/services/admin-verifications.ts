import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import {
  createLoginVerification,
  deletePendingRegisterVerification,
  getPendingRegisterVerification,
  getPendingRegisterVerifications,
} from '../cache/auth-cache'
import type { TypedRedis } from '../cache/scripts'
import { parseToken, TokenKind } from '../lib/tokens'
import { sendVerificationEmail } from './emails'
import { createUserInternal } from './users'

export type CompletePendingVerificationResult =
  | { success: true; userId: string }
  | {
      success: false
      error: 'badUnknownVerification' | 'badKnownEmail' | 'badKnownName'
    }

export type ResendPendingVerificationResult =
  | { success: true; verificationId: string }
  | { success: false; error: 'badEndpoint' | 'badUnknownVerification' }

export const getPendingTeamVerifications = async (redis: TypedRedis) => {
  return await getPendingRegisterVerifications(redis)
}

export const completePendingTeamVerification = async (
  db: DatabaseClient,
  redis: TypedRedis,
  verificationId: string
): Promise<CompletePendingVerificationResult> => {
  const pending = await getPendingRegisterVerification(redis, verificationId)
  if (!pending) {
    return { success: false, error: 'badUnknownVerification' }
  }

  const result = await createUserInternal(db, {
    name: pending.name,
    email: pending.email,
    division: pending.division,
    ctftimeId: null,
  })

  if (!result.success) {
    if (result.error === 'badKnownEmail') {
      return { success: false, error: 'badKnownEmail' }
    }
    if (result.error === 'badKnownName') {
      return { success: false, error: 'badKnownName' }
    }
    throw new Error(`Unexpected user creation error: ${result.error}`)
  }

  await deletePendingRegisterVerification(redis, verificationId)
  return { success: true, userId: result.userId }
}

export const resendPendingTeamVerification = async (
  redis: TypedRedis,
  verificationId: string
): Promise<ResendPendingVerificationResult> => {
  const pending = await getPendingRegisterVerification(redis, verificationId)
  if (!pending) {
    return { success: false, error: 'badUnknownVerification' }
  }

  if (!config.email) {
    return { success: false, error: 'badEndpoint' }
  }

  const token = await createLoginVerification(redis, {
    kind: 'register',
    name: pending.name,
    email: pending.email,
    division: pending.division,
  })

  const parsed = await parseToken(TokenKind.Verify, token)
  if (!parsed) {
    throw new Error('Resent verification token could not be parsed')
  }

  try {
    await sendVerificationEmail(pending.email, 'register', token)
  } catch (error) {
    await deletePendingRegisterVerification(redis, parsed.verifyId)
    throw error
  }

  await deletePendingRegisterVerification(redis, verificationId)

  return { success: true, verificationId: parsed.verifyId }
}
