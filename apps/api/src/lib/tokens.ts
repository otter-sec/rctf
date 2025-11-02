import { config } from '../config'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const keyBytes = Buffer.from(config.tokenKey, 'base64')

let cryptoKeyPromise: Promise<CryptoKey> | null = null

const getCryptoKey = (): Promise<CryptoKey> => {
  if (!cryptoKeyPromise) {
    cryptoKeyPromise = crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    )
  }
  return cryptoKeyPromise
}

const nowInSeconds = () => Math.floor(Date.now() / 1000)

export enum TokenKind {
  Auth = 0,
  Team = 1,
  Verify = 2,
  CtftimeAuth = 4,
}

export type AuthTokenData = string
export type TeamTokenData = string

export type VerifyTokenKinds = 'register' | 'update' | 'recover'

export interface BaseVerifyTokenData {
  verifyId: string
  kind: VerifyTokenKinds
}

export interface RegisterVerifyTokenData extends BaseVerifyTokenData {
  kind: 'register'
  email: string
  name: string
  division: string
}

export interface UpdateVerifyTokenData extends BaseVerifyTokenData {
  kind: 'update'
  userId: string
  email: string
  division: string
}

export interface RecoverVerifyTokenData extends BaseVerifyTokenData {
  kind: 'recover'
  userId: string
  email: string
}

export type VerifyTokenData =
  | RegisterVerifyTokenData
  | UpdateVerifyTokenData
  | RecoverVerifyTokenData

export interface CtftimeAuthTokenData {
  name: string
  ctftimeId: number
}

interface TokenPayloadMap {
  [TokenKind.Auth]: AuthTokenData
  [TokenKind.Team]: TeamTokenData
  [TokenKind.Verify]: VerifyTokenData
  [TokenKind.CtftimeAuth]: CtftimeAuthTokenData
}

type InternalTokenData<Kind extends TokenKind> = {
  k: Kind
  t: number
  d: TokenPayloadMap[Kind]
}

const getTokenExpiry = (kind: TokenKind): number => {
  switch (kind) {
    case TokenKind.Verify:
    case TokenKind.CtftimeAuth:
      return config.loginTimeoutSeconds
    default:
      return Number.POSITIVE_INFINITY
  }
}

const concatBytes = (a: Uint8Array, b: ArrayBuffer): Uint8Array => {
  const buffer = new Uint8Array(a.length + b.byteLength)
  buffer.set(a, 0)
  buffer.set(new Uint8Array(b), a.length)
  return buffer
}

export type Token = string

export const createToken = async <Kind extends TokenKind>(
  kind: Kind,
  data: TokenPayloadMap[Kind]
): Promise<Token> => {
  const content: InternalTokenData<Kind> = {
    k: kind,
    t: nowInSeconds(),
    d: data,
  }

  const plaintext = encoder.encode(JSON.stringify(content))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await getCryptoKey()

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    plaintext
  )

  const payload = concatBytes(iv, ciphertext)
  return Buffer.from(payload).toString('base64')
}

export const parseToken = async <Kind extends TokenKind>(
  expectedKind: Kind,
  token: Token
): Promise<TokenPayloadMap[Kind] | null> => {
  try {
    const raw = Buffer.from(token, 'base64')
    if (raw.byteLength <= 12) {
      return null
    }
    const iv = raw.subarray(0, 12)
    const ciphertext = raw.subarray(12)
    const key = await getCryptoKey()

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      ciphertext
    )

    const json = decoder.decode(new Uint8Array(plaintext))
    const parsed = JSON.parse(json) as InternalTokenData<TokenKind>

    if (parsed.k !== expectedKind) {
      return null
    }

    const expiry = getTokenExpiry(parsed.k)
    if (Number.isFinite(expiry) && parsed.t + expiry < nowInSeconds()) {
      return null
    }

    return parsed.d as TokenPayloadMap[Kind]
  } catch (error) {
    return null
  }
}
