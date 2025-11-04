import { HTTPException } from 'hono/http-exception'
import type { Context } from 'hono'

import type { AppEnv } from '../types'
import { parseToken, TokenKind } from './tokens'

const AUTH_HEADER_PREFIX = 'bearer '

export const requireAuth = async (c: Context<AppEnv>): Promise<any> => {
  const header = c.req.header('authorization') ?? ''

  if (!header || !header.toLowerCase().startsWith(AUTH_HEADER_PREFIX)) {
    throw new HTTPException(401, {
      message: 'Missing or invalid Authorization header',
    })
  }

  const token = header.slice(AUTH_HEADER_PREFIX.length)

  const userId = await parseToken(TokenKind.Auth, token)
  if (!userId) {
    throw new HTTPException(401, { message: 'Invalid auth token' })
  }

  const db = c.get('db')

  /// TODO(es3n1n): actual logic
  throw new HTTPException(401, { message: 'Unknown user' })
}
