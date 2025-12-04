import { config } from '@rctf/config'

const tokenKey = await crypto.subtle.importKey(
  'raw',
  Uint8Array.from(atob(config.tokenKey), c => c.charCodeAt(0)),
  { name: 'AES-GCM' },
  false,
  ['encrypt', 'decrypt']
)

export enum TokenKind {
  Auth = 0,
  Team = 1,
  Verify = 2,
  CtftimeAuth = 4,
  DiscordAuth = 5,
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

export interface DiscordAuthTokenData {
  name: string
  discordId: NonNullable<string>
}

// Internal map of type definitions for typing purposes only -
// this type does not describe a real data-structure
export interface TokenDataTypes {
  [TokenKind.Auth]: AuthTokenData
  [TokenKind.Team]: TeamTokenData
  [TokenKind.Verify]: VerifyTokenData
  [TokenKind.CtftimeAuth]: CtftimeAuthTokenData
  [TokenKind.DiscordAuth]: DiscordAuthTokenData
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
  [TokenKind.DiscordAuth]: config.loginTimeout,
}

const timeNow = () => Math.floor(Date.now() / 1000)

const encryptToken = async <Kind extends TokenKind>(
  content: InternalTokenData<Kind>
): Promise<Token> => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plainText = Buffer.from(JSON.stringify(content))

  const cipherText = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    tokenKey,
    plainText
  )

  return Buffer.concat([iv, new Uint8Array(cipherText)]).toString('base64')
}

const decryptToken = async <Kind extends TokenKind>(
  token: Token
): Promise<InternalTokenData<Kind> | null> => {
  try {
    const buf = Buffer.from(token, 'base64')
    const iv = buf.subarray(0, 12)
    const cipherText = buf.subarray(12, buf.length)

    const plainText = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      tokenKey,
      cipherText
    )

    return JSON.parse(
      Buffer.from(plainText).toString()
    ) as InternalTokenData<Kind>
  } catch {
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
