import { statSync } from 'fs'
import { createHmac } from 'node:crypto'
import { homedir } from 'os'
import Docker from 'dockerode'
import postgres, { type Sql } from 'postgres'

const getDockerOpts = (): Docker.DockerOptions => {
  if (process.env.DOCKER_HOST) {
    return {
      host: process.env.DOCKER_HOST,
      port: parseInt(process.env.DOCKER_PORT ?? '2375'),
    }
  }
  if (process.env.DOCKER_SOCKET) {
    return { socketPath: process.env.DOCKER_SOCKET }
  }
  if (process.platform === 'win32') {
    return { host: '127.0.0.1', port: 2375 }
  }
  for (const p of [
    '/run/docker.sock',
    '/var/run/docker.sock',
    `${homedir()}/.docker/run/docker.sock`,
  ]) {
    try {
      if (statSync(p).isSocket()) {
        return { socketPath: p }
      }
    } catch {
      // try next
    }
  }
  throw new Error('Docker socket not found')
}

export const docker = new Docker(getDockerOpts())
export const PROJECT = 'dynamic-scoring'
export const RCTF_BASE_URL = 'http://127.0.0.1:8090'
export const MOCK_BASE_URL = 'http://127.0.0.1:8091'
export const MOCK_INTERNAL_URL = 'http://mock-backend:80'

export const db: Sql = postgres({
  host: '127.0.0.1',
  port: 35432,
  user: 'rctf',
  password: 'rctf',
  database: 'rctf',
})

type ReqInit = Omit<RequestInit, 'body'> & { body?: unknown }

export type ApiResponse<T = unknown> = { status: number; body: T }

const req = async <T = unknown>(
  base: string,
  path: string,
  init?: ReqInit
): Promise<ApiResponse<T>> => {
  const { body, ...rest } = init ?? {}
  const opts: RequestInit = { ...rest }
  if (body !== undefined) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body)
    opts.headers = {
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    }
  }
  const res = await fetch(`${base}${path}`, opts)
  const parsed = await res.json().catch(() => null as unknown as T)
  return { status: res.status, body: parsed as T }
}

export const api = <T = unknown>(
  path: string,
  init?: ReqInit
): Promise<ApiResponse<T>> => req<T>(RCTF_BASE_URL, path, init)

export const mock = <T = unknown>(
  path: string,
  init?: ReqInit
): Promise<ApiResponse<T>> => req<T>(MOCK_BASE_URL, path, init)

const withBearer = (init: ReqInit | undefined, token: string): ReqInit => ({
  ...(init ?? {}),
  headers: {
    ...(init?.headers ?? {}),
    Authorization: `Bearer ${token}`,
  },
})

export interface TestUser {
  name: string
  id: string
  token: string
  division: string
}

export const testId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const registerUser = async (name?: string): Promise<TestUser> => {
  const username = name ?? testId('user')
  const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@test.local`
  const reg = await api<{
    kind: string
    data?: { authToken?: string }
  }>('/api/v1/auth/register', {
    method: 'POST',
    body: { name: username, email },
  })
  if (reg.status !== 200 || !reg.body.data?.authToken) {
    throw new Error(
      `registerUser failed (${reg.status}): ${JSON.stringify(reg.body)}`
    )
  }
  const token = reg.body.data.authToken
  const me = await api<{
    data?: { id?: string; division?: string }
  }>('/api/v1/users/me', withBearer(undefined, token))
  if (!me.body.data?.id || !me.body.data?.division) {
    throw new Error(`/users/me failed: ${JSON.stringify(me.body)}`)
  }
  return {
    name: username,
    id: me.body.data.id,
    token,
    division: me.body.data.division,
  }
}

export const makeAdmin = async (user: TestUser): Promise<void> => {
  await db`UPDATE users SET perms = 63 WHERE id = ${user.id}`
  const res = await api(
    '/api/v1/users/me',
    withBearer(
      {
        method: 'PATCH',
        body: { division: user.division },
      },
      user.token
    )
  )
  if (res.status !== 200) {
    throw new Error(`makeAdmin cache-bust failed: ${JSON.stringify(res.body)}`)
  }
}

export type DecayChallengeData = {
  name: string
  description: string
  category: string
  author: string
  flag: string
  points: { min: number; max: number }
  tiebreakEligible?: boolean
  files?: { name: string; url: string; size?: number | null }[]
}

export const createDecayChallenge = async (
  admin: TestUser,
  id: string,
  data: DecayChallengeData
): Promise<ApiResponse> => {
  return await api(
    `/api/v2/admin/challs/${id}`,
    withBearer(
      {
        method: 'PUT',
        body: {
          data: {
            ...data,
            files: data.files ?? [],
            tiebreakEligible: data.tiebreakEligible ?? true,
            scoring: { kind: 'decay' },
          },
        },
      },
      admin.token
    )
  )
}

export type DynamicSourceConfig = {
  transport: 'webhook' | 'poll'
  url?: string
  pollIntervalSeconds?: number
  secret: string
}

export const createDynamicChallenge = async (
  admin: TestUser,
  id: string,
  source: DynamicSourceConfig,
  overrides?: Partial<DecayChallengeData>
): Promise<ApiResponse> => {
  const data = {
    name: overrides?.name ?? id,
    description: overrides?.description ?? '',
    category: overrides?.category ?? 'dynamic',
    author: overrides?.author ?? 'test',
    flag: overrides?.flag ?? '',
    points: overrides?.points ?? { min: 0, max: 0 },
    tiebreakEligible: overrides?.tiebreakEligible ?? true,
    files: overrides?.files ?? [],
    scoring: { kind: 'dynamic', source },
  }
  return await api(
    `/api/v2/admin/challs/${id}`,
    withBearer({ method: 'PUT', body: { data } }, admin.token)
  )
}

export type ScoreEntry = { userId: string; points: number }
export type ScorePayload = {
  scores: ScoreEntry[]
}

export const signAndPushScores = async (
  challengeId: string,
  secret: string,
  payload: ScorePayload,
  overrides?: { timestamp?: number; signature?: string }
): Promise<ApiResponse> => {
  const body = JSON.stringify(payload)
  const ts = (overrides?.timestamp ?? Date.now()).toString()
  const sig =
    overrides?.signature ??
    `sha256=${createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')}`
  return await api(`/api/v2/challs/${challengeId}/scores`, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-RCTF-Timestamp': ts,
      'X-RCTF-Signature': sig,
    },
  })
}

export const setMockScores = async (
  challengeId: string,
  payload: ScorePayload
): Promise<void> => {
  const res = await mock(`/control/${challengeId}`, {
    method: 'PUT',
    body: payload,
  })
  if (res.status !== 200) {
    throw new Error(
      `mock setMockScores failed (${res.status}): ${JSON.stringify(res.body)}`
    )
  }
}

export const clearMockScores = async (): Promise<void> => {
  const res = await mock('/control', { method: 'DELETE' })
  if (res.status !== 200) {
    throw new Error(`mock clear failed: ${JSON.stringify(res.body)}`)
  }
}

export const stageMockFailure = async (
  challengeId: string,
  status = 503
): Promise<void> => {
  const res = await mock(`/control/${challengeId}/fail?status=${status}`, {
    method: 'POST',
  })
  if (res.status !== 200) {
    throw new Error(`mock fail-stage failed: ${JSON.stringify(res.body)}`)
  }
}

export type LeaderboardEntry = {
  id: string
  name: string
  score: number
  globalPlace?: number | null
  division?: string
}

export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const res = await api<{
    data?: { leaderboard?: LeaderboardEntry[] }
  }>('/api/v1/leaderboard/now?limit=100&offset=0')
  return res.body.data?.leaderboard ?? []
}

export const awaitLeaderboard = async (
  predicate: (entries: LeaderboardEntry[]) => boolean,
  timeout = 15_000
): Promise<LeaderboardEntry[]> => {
  const start = Date.now()
  let entries = await fetchLeaderboard()
  while (Date.now() - start < timeout) {
    if (predicate(entries)) {
      return entries
    }
    await Bun.sleep(200)
    entries = await fetchLeaderboard()
  }
  throw new Error(
    `awaitLeaderboard timed out. Last snapshot: ${JSON.stringify(entries)}`
  )
}

type ChallengeListItem = {
  id: string
  scoringKind?: 'decay' | 'dynamic'
  yourScore?: number
}

export const fetchYourScore = async (
  user: TestUser,
  challengeId: string
): Promise<number | undefined> => {
  const res = await api<{ data?: ChallengeListItem[] }>(
    '/api/v2/challs',
    withBearer(undefined, user.token)
  )
  return res.body.data?.find(c => c.id === challengeId)?.yourScore
}

export const awaitYourScore = async (
  user: TestUser,
  challengeId: string,
  predicate: (score: number | undefined) => boolean,
  timeout = 15_000
): Promise<number | undefined> => {
  const start = Date.now()
  let score = await fetchYourScore(user, challengeId)
  while (Date.now() - start < timeout) {
    if (predicate(score)) {
      return score
    }
    await Bun.sleep(200)
    score = await fetchYourScore(user, challengeId)
  }
  throw new Error(
    `awaitYourScore timed out for ${user.name} on ${challengeId}. Last score: ${score}`
  )
}

export const submitFlag = async (
  user: TestUser,
  challengeId: string,
  flag: string
): Promise<ApiResponse> => {
  return await api(
    `/api/v1/challs/${challengeId}/submit`,
    withBearer({ method: 'POST', body: { flag } }, user.token)
  )
}

export const cleanupChallenge = async (id: string): Promise<void> => {
  await db`DELETE FROM score_events WHERE challengeid = ${id}`
  await db`DELETE FROM solves WHERE challengeid = ${id}`
  await db`DELETE FROM challenges WHERE id = ${id}`
}

export const cleanupUser = async (user: TestUser): Promise<void> => {
  await db`DELETE FROM score_events WHERE userid = ${user.id}`
  await db`DELETE FROM solves WHERE userid = ${user.id}`
  await db`DELETE FROM user_members WHERE userid = ${user.id}`
  await db`DELETE FROM users WHERE id = ${user.id}`
}

export const setUserBanned = async (
  user: TestUser,
  banned: boolean
): Promise<void> => {
  await db`UPDATE users SET banned = ${banned} WHERE id = ${user.id}`
}
