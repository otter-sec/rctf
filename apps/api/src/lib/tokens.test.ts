import { afterEach, expect, setSystemTime, test } from 'bun:test'

const tokenSeed = Buffer.alloc(32, 1).toString('base64')
process.env.TOKEN_KEY = process.env.TOKEN_KEY ?? tokenSeed
process.env.LOGIN_TIMEOUT = process.env.LOGIN_TIMEOUT ?? '3600'
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://local:local@localhost:5432/rctf_test'

const tokensModule = await import('./tokens')
const configModule = await import('../config')

const { createToken, parseToken, TokenKind } = tokensModule
const { config } = configModule

afterEach(() => {
  setSystemTime()
})

test('creates and parses an auth token', async () => {
  const userId = crypto.randomUUID()
  const token = await createToken(TokenKind.Auth, userId)
  const parsed = await parseToken(TokenKind.Auth, token)

  expect(parsed).toBe(userId)
})

test('parsing with mismatched kind fails', async () => {
  const userId = crypto.randomUUID()
  const token = await createToken(TokenKind.Auth, userId)

  const parsed = await parseToken(TokenKind.Team, token)
  expect(parsed).toBeNull()
})

test('tampering with the payload invalidates the token', async () => {
  const userId = crypto.randomUUID()
  const token = await createToken(TokenKind.Auth, userId)
  const tampered = token.slice(0, -2) + 'AA'

  const parsed = await parseToken(TokenKind.Auth, tampered)
  expect(parsed).toBeNull()
})

test('verify tokens expire according to configuration', async () => {
  const originalTimeout = config.loginTimeoutSeconds

  try {
    config.loginTimeoutSeconds = 1

    const issuedAt = new Date('2024-01-01T00:00:00.000Z')
    setSystemTime(issuedAt)

    const verifyToken = await createToken(TokenKind.Verify, {
      verifyId: crypto.randomUUID(),
      kind: 'register',
      email: 'user@example.com',
      name: 'Example User',
      division: 'open',
    })

    setSystemTime(new Date(issuedAt.getTime() + 2_000))

    const parsed = await parseToken(TokenKind.Verify, verifyToken)
    expect(parsed).toBeNull()
  } finally {
    config.loginTimeoutSeconds = originalTimeout
  }
})
