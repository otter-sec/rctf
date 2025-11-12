import { config } from '@rctf/config'
import type { RedisClient } from 'bun'
import {
  createToken,
  TokenKind,
  type RecoverTokenData,
  type RegisterVerifyTokenData,
  type UpdateVerifyTokenData,
  type VerifyTokenData,
} from '../lib/tokens'

export const storeLoginVerification = async (
  client: RedisClient,
  id: VerifyTokenData['verifyId']
): Promise<void> => {
  await client.set(`login:${id}`, '0', 'PX', config.loginTimeout)
}

export const checkLoginVerification = async (
  client: RedisClient,
  id: VerifyTokenData['verifyId']
): Promise<boolean> => {
  const result = await client.del(`login:${id}`)
  return result === 1
}

export const createLoginVerification = async (
  client: RedisClient,
  data:
    | Omit<RegisterVerifyTokenData, 'verifyId'>
    | Omit<UpdateVerifyTokenData, 'verifyId'>
    | Omit<RecoverTokenData, 'verifyId'>
): Promise<string> => {
  const verifyId = crypto.randomUUID()
  await storeLoginVerification(client, verifyId)
  return await createToken(TokenKind.Verify, {
    ...data,
    verifyId,
  })
}
