import {
  tokenKinds,
  getToken,
  getData,
  CtftimeAuthTokenData,
} from '../../../src/auth/token'
import config from '../../../src/config/server'
import crypto from 'crypto'
import { promisify } from 'util'

test('round-trip token is valid', async () => {
  const origData: CtftimeAuthTokenData = {
    name: 'name',
    ctftimeId: 'ctftimeId',
  }
  const token: string = await getToken(tokenKinds.ctftimeAuth, origData)
  const roundtripData: CtftimeAuthTokenData | null = await getData(
    tokenKinds.ctftimeAuth,
    token
  )
  expect(roundtripData).not.toBeNull()
  expect(roundtripData).toStrictEqual(origData)
})

test('token with wrong kind returns null', async () => {
  const token = await getToken(tokenKinds.team, 'data')
  const extracted = await getData(tokenKinds.auth, token)
  expect(extracted).toBeNull()
})

test('token expires', async () => {
  jest.useFakeTimers('modern')

  const createdAt = Date.now()
  const token = await getToken(tokenKinds.verify, {
    kind: 'register',
    verifyId: 'id',
    name: 'name',
    email: 'email',
    division: 'division',
  })
  jest.setSystemTime(createdAt + config.loginTimeout * 1000 + 1500)

  const extracted = await getData(tokenKinds.verify, token)
  expect(extracted).toBeNull()
})

test('corrupted token is invalid', async () => {
  // FIXME: improve corruption method?
  let token = ''
  while (token[0] === 'a') {
    token = await getToken(tokenKinds.team, 'data')
  }
  const corruptedToken = 'a' + token.substr(1)

  const extracted = await getData(tokenKinds.team, corruptedToken)
  expect(extracted).toBeNull()
})

test('garbage token is invalid', async () => {
  const randomBytes = promisify(crypto.randomBytes)

  const token = (await randomBytes(64)).toString('base64')

  const extracted = await getData(tokenKinds.team, token)
  expect(extracted).toBeNull()
})
test('token tampering is detected', async () => {
  const token = await getToken(tokenKinds.team, 'data')

  const tamperedToken = token.substring(0, token.length - 5) + 'xxxxx'

  const extracted = await getData(tokenKinds.team, tamperedToken)
  expect(extracted).toBeNull()
})

test('empty token is invalid', async () => {
  const extracted = await getData(tokenKinds.team, '')
  expect(extracted).toBeNull()
})

test('token expiration edge case', async () => {
  jest.useFakeTimers()

  const token = await getToken(tokenKinds.verify, {
    kind: 'recover',
    verifyId: 'id',
    userId: 'user123',
    email: 'user@example.com',
  })
  console.log('Generated Token:', token)

  const extractedBefore = await getData(tokenKinds.verify, token)
  console.log('Extracted Before Expiration:', extractedBefore)

  jest.advanceTimersByTime(config.loginTimeout * 1000 - 1)
  expect(await getData(tokenKinds.verify, token)).not.toBeNull()

  jest.useRealTimers()
})

test('invalid token kind returns null', async () => {
  const token = await getToken(tokenKinds.team, 'data')

  const extracted = await getData('invalidKind' as unknown as tokenKinds, token)

  expect(extracted).toBeNull()
})
