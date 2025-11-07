import { config } from '@rctf/config'
import type { RedisClient } from 'bun'
import type { VerifyTokenData } from '../lib/tokens'

export const storeLoginVerification = async (
  client: RedisClient,
  {
    id,
  }: {
    id: VerifyTokenData['verifyId']
  }
): Promise<void> => {
  await client.set(`login:${id}`, '0', 'PX', config.loginTimeout)
}

export const checkLoginVerification = async (
  client: RedisClient,
  {
    id,
  }: {
    id: VerifyTokenData['verifyId']
  }
): Promise<boolean> => {
  const result = await client.del(`login:${id}`)
  return result === 1
}
