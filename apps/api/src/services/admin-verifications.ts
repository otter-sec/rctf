import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import type { TypedRedis } from '../cache/scripts'
import { type EmailKind, sendVerificationEmail } from './emails'
import {
  deletePendingRegistrationVerification,
  getPendingRegistrationVerification,
  getPendingRegistrationVerifications,
} from './registration-verifications'
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

export const getPendingTeamVerifications = async (db: DatabaseClient) => {
  return await getPendingRegistrationVerifications(db)
}

export const completePendingTeamVerification = async (
  db: DatabaseClient,
  verificationId: string
): Promise<CompletePendingVerificationResult> => {
  const pending = await getPendingRegistrationVerification(db, verificationId)
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

  await deletePendingRegistrationVerification(db, verificationId)
  return { success: true, userId: result.userId }
}

type VerificationEmailSender = (
  to: string,
  kind: EmailKind,
  token: string
) => Promise<void>

export const resendPendingTeamVerification = async (
  db: DatabaseClient,
  verificationId: string,
  sendEmail?: VerificationEmailSender,
  redis?: TypedRedis
): Promise<ResendPendingVerificationResult> => {
  const pending = await getPendingRegistrationVerification(db, verificationId)
  if (!pending) {
    return { success: false, error: 'badUnknownVerification' }
  }

  if (!config.email) {
    return { success: false, error: 'badEndpoint' }
  }

  const send =
    sendEmail ??
    ((to: string, kind: EmailKind, token: string) =>
      sendVerificationEmail(db, to, kind, token, redis))
  await send(pending.email, 'register', pending.token)
  return { success: true, verificationId: pending.id }
}
