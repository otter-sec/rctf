import { users } from '@rctf/db'
import type { InferSelectModel } from '@rctf/db'
import { Hono } from 'hono'

import type { AppEnv } from '../types'
import { requireAuth } from '../lib/auth'
import { createToken, TokenKind } from '../lib/tokens'

const serializeUser = (user: InferSelectModel<typeof users>) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  division: user.division,
  perms: user.perms,
  ctftimeId: user.ctftimeId,
  createdAt: user.createdAt,
})

export const usersRoutes = new Hono<AppEnv>()

usersRoutes.get('/me', async c => {
  const user = await requireAuth(c)
  const teamToken = await createToken(TokenKind.Team, user.id)

  // refreshes user payload to reflect any concurrent updates
  const db = c.get('db')
  const freshUser = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, user.id),
  })

  const payload = freshUser ?? user

  return c.json({
    user: serializeUser(payload),
    teamToken,
  })
})
