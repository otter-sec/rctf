// TODO(es3n1n): refactor this to the new routes thing once we merged all of them
import { users } from '@rctf/db'
import type { InferSelectModel } from '@rctf/db'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

import type { AppEnv } from '../types'
import { createToken, parseToken, TokenKind } from '../lib/tokens'
import { rateLimit } from '../middleware/ratelimit'

const NAME_REGEX = /^[ -~]{2,64}$/
const BASE64_REGEX = /^[A-Za-z0-9+/=]+$/

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .refine(value => NAME_REGEX.test(value), {
      message: 'Name must be 2-64 ASCII characters',
    }),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform(value => value.toLowerCase())
    .optional()
    .nullable(),
  division: z
    .string()
    .trim()
    .min(1, { message: 'Division is required' })
    .max(128),
})

const loginSchema = z.object({
  teamToken: z.string().trim().min(1),
})

const serializeUser = (user: InferSelectModel<typeof users>) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  division: user.division,
  perms: user.perms,
  ctftimeId: user.ctftimeId,
  createdAt: user.createdAt,
})

export const authRoutes = new Hono<AppEnv>()

authRoutes.use(
  '/register',
  rateLimit({
    limit: 5,
    windowMs: 10 * 60 * 1000,
    message: 'Too many registration attempts. Please try again later.',
  })
)

authRoutes.use(
  '/login',
  rateLimit({
    limit: 10,
    windowMs: 60 * 1000,
    message: 'Too many login attempts. Please wait before retrying.',
  })
)

authRoutes.post('/register', zValidator('json', registerSchema), async c => {
  const body = c.req.valid('json')
  const db = c.get('db')

  const normalizedName = body.name
    .trim()
    .replace(/\u0000/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')

  if (!NAME_REGEX.test(normalizedName)) {
    throw new HTTPException(422, {
      message: 'Name must be 2-64 ASCII characters after normalization',
    })
  }

  const normalizedDivision = body.division.trim()
  if (normalizedDivision.length === 0) {
    throw new HTTPException(422, { message: 'Division is required' })
  }

  const normalizedEmail = body.email ? body.email.toLowerCase() : null
  if (normalizedEmail !== null && normalizedEmail.length === 0) {
    throw new HTTPException(422, { message: 'Email must not be empty' })
  }

  const existingByName = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.name, normalizedName),
  })

  if (existingByName) {
    throw new HTTPException(409, { message: 'Name already in use' })
  }

  if (normalizedEmail) {
    const existingByEmail = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, normalizedEmail),
    })

    if (existingByEmail) {
      throw new HTTPException(409, { message: 'Email already in use' })
    }
  }

  const [user] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name: normalizedName,
      email: normalizedEmail,
      division: normalizedDivision,
      perms: 0,
    })
    .returning()

  if (!user) {
    throw new HTTPException(500, { message: 'Failed to create user' })
  }

  const authToken = await createToken(TokenKind.Auth, user.id)
  const teamToken = await createToken(TokenKind.Team, user.id)

  return c.json(
    {
      authToken,
      teamToken,
      user: serializeUser(user),
    },
    201
  )
})

authRoutes.post('/login', zValidator('json', loginSchema), async c => {
  const { teamToken } = c.req.valid('json')
  const db = c.get('db')

  const sanitizedToken = teamToken.trim()
  if (sanitizedToken.length < 16 || !BASE64_REGEX.test(sanitizedToken)) {
    throw new HTTPException(400, { message: 'teamToken is malformed' })
  }

  const userId = await parseToken(TokenKind.Team, sanitizedToken)
  if (!userId) {
    throw new HTTPException(401, { message: 'Invalid team token' })
  }

  const user = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  })

  if (!user) {
    throw new HTTPException(401, { message: 'Unknown user' })
  }

  const authToken = await createToken(TokenKind.Auth, user.id)

  return c.json({
    authToken,
    user: serializeUser(user),
  })
})
