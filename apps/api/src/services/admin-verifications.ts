import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import { sendVerificationEmail } from './emails'
import {
  deletePendingRegistrationVerification,
  getPendingRegistrationVerification,
  getPendingRegistrationVerifications,
} from './registration-verifications'
import { createUserInternal } from './users'

type PendingTeamVerification = {
  id: string
  name: string
  email: string
  division: string
  createdAt: number
  expiresAt: number
}

type PendingTeamVerificationList = {
  total: number
  verifications: PendingTeamVerification[]
}

export type CompletePendingVerificationResult =
  | { success: true; userId: string }
  | {
      success: false
      error: 'badUnknownVerification' | 'badKnownEmail' | 'badKnownName'
    }

export type ResendPendingVerificationResult =
  | { success: true; verificationId: string }
  | { success: false; error: 'badEndpoint' | 'badUnknownVerification' }

export const getPendingTeamVerifications = async (
  db: DatabaseClient,
  pagination: { limit: number; offset: number }
): Promise<PendingTeamVerificationList> => {
  const page = await getPendingRegistrationVerifications(db, pagination)

  return {
    total: page.total,
    verifications: page.verifications.map(verification => ({
      ...verification,
      createdAt: new Date(verification.createdAt).getTime(),
      expiresAt: new Date(verification.expiresAt).getTime(),
    })),
  }
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

type VerificationEmailSender = typeof sendVerificationEmail

export const resendPendingTeamVerification = async (
  db: DatabaseClient,
  verificationId: string,
  sendEmail: VerificationEmailSender = sendVerificationEmail
): Promise<ResendPendingVerificationResult> => {
  const pending = await getPendingRegistrationVerification(db, verificationId)
  if (!pending) {
    return { success: false, error: 'badUnknownVerification' }
  }

  if (!config.email) {
    return { success: false, error: 'badEndpoint' }
  }

  await sendEmail(pending.email, 'register', pending.token)
  return { success: true, verificationId: pending.id }
}
