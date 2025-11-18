import { config } from '@rctf/config'
import {
  createToken,
  TokenKind,
  type RecoverTokenData,
  type RegisterVerifyTokenData,
  type UpdateVerifyTokenData,
  type VerifyTokenData,
} from '../lib/tokens'
import type { TypedRedis } from './scripts'

export const storeLoginVerification = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<void> => {
  await client.set(`login:${id}`, '0', 'PX', config.loginTimeout)
}

export const checkLoginVerification = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<boolean> => {
  const result = await client.del(`login:${id}`)
  return result === 1
}

export const createLoginVerification = async (
  client: TypedRedis,
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
