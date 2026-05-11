import { config } from '@rctf/config'
import { describe, expect, test } from 'bun:test'
import {
  createToken,
  parseToken,
  TokenKind,
  type CtftimeAuthTokenData,
} from '../../../../apps/api/src/lib/tokens'

describe('token', () => {
  test('round-trip token is valid', async () => {
    const origData: CtftimeAuthTokenData = {
      name: 'name',
      ctftimeId: 'ctftimeId',
    }
    const token = await createToken(TokenKind.CtftimeAuth, origData)
    const roundtripData = await parseToken(TokenKind.CtftimeAuth, token)

    expect(roundtripData).not.toBeNull()
    expect(roundtripData).toStrictEqual(origData)
  })

  test('token with wrong kind returns null', async () => {
    const token = await createToken(TokenKind.Team, 'data')
    const extracted = await parseToken(TokenKind.Auth, token)

    expect(extracted).toBeNull()
  })

  test('token expires', async () => {
    // Store original Date.now
    const originalNow = Date.now

    try {
      const createdAt = Date.now()
      const token = await createToken(TokenKind.Verify, {
        kind: 'update',
        verifyId: 'id',
        userId: 'user-id',
        email: 'email',
      })

      // Mock Date.now to return time after expiry
      Date.now = () => createdAt + config.loginTimeout * 1000 + 1500

      const extracted = await parseToken(TokenKind.Verify, token)
      expect(extracted).toBeNull()
    } finally {
      // Restore original Date.now
      Date.now = originalNow
    }
  })

  test('corrupted token is invalid', async () => {
    let token = ''
    // Keep generating until we get a token that doesn't start with 'a'
    while (!token || token[0] === 'a') {
      token = await createToken(TokenKind.Team, 'data')
    }
    const corruptedToken = 'a' + token.substring(1)

    const extracted = await parseToken(TokenKind.Team, corruptedToken)
    expect(extracted).toBeNull()
  })

  test('garbage token is invalid', async () => {
    const randomBytes = crypto.getRandomValues(new Uint8Array(64))
    const token = Buffer.from(randomBytes).toString('base64')

    const extracted = await parseToken(TokenKind.Team, token)
    expect(extracted).toBeNull()
  })
})
