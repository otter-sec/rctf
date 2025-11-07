import crypto from 'crypto'
import { promisify } from 'util'
import { config } from '@rctf/config'

const randomBytes = promisify(crypto.randomBytes)
const tokenKey = Buffer.from(config.tokenKey, 'base64')

export enum TokenKind {
  Auth = 0,
  Team = 1,
  Verify = 2,
  CtftimeAuth = 4,
}

export type VerifyTokenKinds = 'update' | 'register' | 'recover'
export type AuthTokenData = string
export type TeamTokenData = string

interface BaseVerifyTokenData {
  verifyId: string
  kind: VerifyTokenKinds
}

export interface RegisterVerifyTokenData extends BaseVerifyTokenData {
  kind: 'register'
  email: NonNullable<string>
  name: string
  division: string
}

export interface UpdateVerifyTokenData extends BaseVerifyTokenData {
  kind: 'update'
  userId: string
  email: NonNullable<string>
  division: string
}

export interface RecoverTokenData extends BaseVerifyTokenData {
  kind: 'recover'
  userId: string
  email: NonNullable<string>
}

export type VerifyTokenData =
  | RegisterVerifyTokenData
  | UpdateVerifyTokenData
  | RecoverTokenData

export interface CtftimeAuthTokenData {
  name: string
  ctftimeId: NonNullable<string>
}

// Internal map of type definitions for typing purposes only -
// this type does not describe a real data-structure
interface TokenDataTypes {
  [TokenKind.Auth]: AuthTokenData
  [TokenKind.Team]: TeamTokenData
  [TokenKind.Verify]: VerifyTokenData
  [TokenKind.CtftimeAuth]: CtftimeAuthTokenData
}

export type Token = string

interface InternalTokenData<Kind extends TokenKind> {
  k: Kind
  t: number
  d: TokenDataTypes[Kind]
}

export const tokenExpiries: Record<TokenKind, number> = {
  [TokenKind.Auth]: Infinity,
  [TokenKind.Team]: Infinity,
  [TokenKind.Verify]: config.loginTimeout,
  [TokenKind.CtftimeAuth]: config.loginTimeout,
}

const timeNow = () => Math.floor(Date.now() / 1000)

const encryptToken = async <Kind extends TokenKind>(
  content: InternalTokenData<Kind>
): Promise<Token> => {
  const iv = await randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', tokenKey, iv)
  const cipherText = cipher.update(JSON.stringify(content))
  cipher.final()
  const tokenContent = Buffer.concat([iv, cipherText, cipher.getAuthTag()])
  return tokenContent.toString('base64')
}

const decryptToken = async <Kind extends TokenKind>(
  token: Token
): Promise<InternalTokenData<Kind> | null> => {
  try {
    const tokenContent = Buffer.from(token, 'base64')
    const iv = tokenContent.subarray(0, 12)
    const authTag = tokenContent.subarray(tokenContent.length - 16)
    const cipher = crypto.createDecipheriv('aes-256-gcm', tokenKey, iv)
    cipher.setAuthTag(authTag)
    const plainText = cipher.update(
      tokenContent.subarray(12, tokenContent.length - 16)
    )
    cipher.final()
    return JSON.parse(plainText.toString()) as InternalTokenData<Kind>
  } catch (e) {
    return null
  }
}

export const parseToken = async <Kind extends TokenKind>(
  expectedTokenKind: Kind,
  token: Token
): Promise<TokenDataTypes[Kind] | null> => {
  const content = await decryptToken<Kind>(token)
  if (content === null) {
    return null
  }
  const { k: kind, t: createdAt, d: data } = content
  if (kind !== expectedTokenKind) {
    return null
  }
  if (createdAt + tokenExpiries[kind] < timeNow()) {
    return null
  }
  return data
}

export const createToken = async <Kind extends TokenKind>(
  tokenKind: Kind,
  data: TokenDataTypes[Kind]
): Promise<Token> => {
  return await encryptToken({
    k: tokenKind,
    t: timeNow(),
    d: data,
  })
}
