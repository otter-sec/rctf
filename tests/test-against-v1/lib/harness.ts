import { statSync } from 'fs'
import { homedir } from 'os'
import Docker from 'dockerode'
import postgres, { type Sql } from 'postgres'

function getDockerOpts(): Docker.DockerOptions {
  if (process.env.DOCKER_HOST) {
    return {
      host: process.env.DOCKER_HOST,
      port: parseInt(process.env.DOCKER_PORT || '2375'),
    }
  }

  if (process.env.DOCKER_SOCKET) {
    return { socketPath: process.env.DOCKER_SOCKET }
  }

  // Docker Desktop default
  if (process.platform === 'win32') {
    // https://github.com/oven-sh/bun/issues/18653
    // return { socketPath: '//./pipe/docker_engine' }
    return { host: '127.0.0.1', port: 2375 }
  }

  // Otherwise search for socket
  for (const p of [
    '/run/docker.sock',
    '/var/run/docker.sock',
    `${homedir()}/.docker/run/docker.sock`,
  ]) {
    if (statSync(p).isSocket()) {
      return { socketPath: p }
    }
  }

  throw new Error('Docker socket not found')
}

export const docker = new Docker(getDockerOpts())
export const PROJECT = 'test-against-v1'

export interface Instance {
  name: string
  url: string
  db: Sql
}

export const instances: Instance[] = [
  {
    name: 'v1',
    url: 'http://127.0.0.1:8081',
    db: postgres({
      host: '127.0.0.1',
      port: 15432,
      user: 'rctf',
      password: 'rctf',
      database: 'rctf',
    }),
  },
  {
    name: 'new',
    url: 'http://127.0.0.1:8082',
    db: postgres({
      host: '127.0.0.1',
      port: 25432,
      user: 'rctf',
      password: 'rctf',
      database: 'rctf',
    }),
  },
]

type ReqInit = Omit<RequestInit, 'body'> & { body?: unknown }

async function req(base: string, path: string, init?: ReqInit) {
  const { body, ...rest } = init ?? {}
  const opts: RequestInit = { ...rest }

  if (body !== undefined) {
    opts.body = JSON.stringify(body)
    opts.headers = { 'Content-Type': 'application/json', ...opts.headers }
  }

  const res = await fetch(`${base}${path}`, opts)
  const b = await res.json().catch(() => null)
  return { status: res.status, body: b }
}

export type ApiResponse = { status: number; body: unknown }
export type AllResponses = Record<string, ApiResponse>

export async function all(path: string, init?: ReqInit): Promise<AllResponses> {
  const results = await Promise.all(instances.map(i => req(i.url, path, init)))
  return Object.fromEntries(
    instances.map((i, idx) => [i.name, results[idx] as ApiResponse])
  )
}

export async function one(
  instanceName: string,
  path: string,
  init?: ReqInit
): Promise<ApiResponse> {
  const instance = instances.find(i => i.name === instanceName)
  if (!instance) {
    throw new Error(`Instance ${instanceName} not found`)
  }
  return req(instance.url, path, init)
}

export async function allAs(
  user: TestUser,
  path: string,
  init?: ReqInit
): Promise<AllResponses> {
  const results = await Promise.all(
    instances.map(i => {
      const token = user.tokens[i.name]
      if (!token) {
        throw new Error(
          `No auth token for user ${user.name} on instance ${i.name}`
        )
      }
      return req(i.url, path, {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${token}`,
        },
      })
    })
  )
  return Object.fromEntries(
    instances.map((i, idx) => [i.name, results[idx] as ApiResponse])
  )
}

export async function allAsCallback(
  user: TestUser,
  path: (instance: Instance) => string,
  init?: ReqInit
): Promise<AllResponses> {
  const results = await Promise.all(
    instances.map(instance =>
      req(instance.url, path(instance), {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${user.tokens[instance.name]}`,
        },
      })
    )
  )

  return Object.fromEntries(
    instances.map((i, idx) => [i.name, results[idx] as ApiResponse])
  )
}

export async function oneAs(
  user: TestUser,
  instanceName: string,
  path: string,
  init?: ReqInit
): Promise<ApiResponse> {
  const instance = instances.find(i => i.name === instanceName)
  if (!instance) {
    throw new Error(`Instance ${instanceName} not found`)
  }

  const token = user.tokens[instanceName]
  if (!token) {
    throw new Error(
      `No auth token for user ${user.name} on instance ${instanceName}`
    )
  }

  return req(instance.url, path, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function allUserProfile(user: TestUser): Promise<AllResponses> {
  const results = await Promise.all(
    instances.map(async i => {
      const userId = user.ids[i.name]
      if (!userId) {
        throw new Error(`No user ID for ${user.name} on instance ${i.name}`)
      }
      return req(i.url, `/api/v1/users/${userId}`, {})
    })
  )
  return Object.fromEntries(
    instances.map((i, idx) => [i.name, results[idx] as ApiResponse])
  )
}

export function assertSame(res: AllResponses, ignore: string[] = []) {
  const normalize = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(normalize)
    }

    const source = obj as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(source).sort()) {
      if (!ignore.includes(k)) {
        out[k] = normalize(source[k])
      }
    }
    return out
  }

  const normalized = Object.fromEntries(
    Object.entries(res).map(([k, v]) => [k, normalize(v)])
  )
  const values = Object.values(normalized).map(v => JSON.stringify(v))
  if (!values.every(v => v === values[0])) {
    throw new Error(
      `Response mismatch:\n${Object.entries(normalized)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('\n')}`
    )
  }
}

export function assertSameKind(res: AllResponses) {
  const kinds = Object.entries(res).map(([name, r]) => ({
    name,
    kind: (r.body as { kind?: string })?.kind,
    status: r.status,
  }))

  const first = kinds[0]
  if (!first) {
    throw new Error('No responses to compare')
  }

  for (const k of kinds.slice(1)) {
    if (k.kind !== first.kind || k.status !== first.status) {
      throw new Error(
        `Response kind mismatch:\n${kinds.map(k => `${k.name}: status=${k.status} kind=${k.kind}`).join('\n')}`
      )
    }
  }
}

export function assertAllSuccess(res: AllResponses) {
  for (const [name, r] of Object.entries(res)) {
    if (r.status < 200 || r.status >= 300) {
      throw new Error(
        `Instance ${name} returned non-success status ${r.status}: ${JSON.stringify(r.body)}`
      )
    }
  }
}

export function assertAllKind(res: AllResponses, kind: string) {
  for (const [name, r] of Object.entries(res)) {
    const actualKind = (r.body as { kind?: string })?.kind
    if (actualKind !== kind) {
      throw new Error(
        `Instance ${name} returned kind "${actualKind}" instead of "${kind}": ${JSON.stringify(r.body)}`
      )
    }
  }
}

export async function allDb<T>(
  fn: (db: Sql, instance: Instance) => Promise<T>
): Promise<Record<string, T>> {
  const results = await Promise.all(instances.map(i => fn(i.db, i)))
  return Object.fromEntries(
    instances.map((i, idx) => [i.name, results[idx]])
  ) as Record<string, T>
}

export interface TestUser {
  name: string
  tokens: Record<string, string>
  ids: Record<string, string>
  divisions: Record<string, string>
}

export async function registerUser(name: string): Promise<TestUser> {
  const user: TestUser = {
    name,
    tokens: {},
    ids: {},
    divisions: {},
  }

  const email = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@test.local`
  for (const instance of instances) {
    const res = await req(instance.url, '/api/v1/auth/register', {
      method: 'POST',
      body: { name, email },
    })

    if (res.status !== 200) {
      throw new Error(
        `Failed to register user ${name} on ${instance.name}: ${JSON.stringify(res.body)}`
      )
    }

    const body = res.body as { kind: string; data?: { authToken?: string } }
    if (body.kind !== 'goodRegister' || !body.data?.authToken) {
      throw new Error(
        `Unexpected register response on ${instance.name}: ${JSON.stringify(res.body)}`
      )
    }

    user.tokens[instance.name] = body.data.authToken

    const meRes = await req(instance.url, '/api/v1/users/me', {
      headers: { Authorization: `Bearer ${body.data.authToken}` },
    })
    const meBody = meRes.body as {
      data?: { id?: string; division?: string }
    }
    if (meBody.data?.id) {
      user.ids[instance.name] = meBody.data.id
    }
    if (meBody.data?.division) {
      user.divisions[instance.name] = meBody.data.division
    }
  }

  return user
}

export async function loginWithTeamToken(
  user: TestUser
): Promise<AllResponses> {
  const results = await Promise.all(
    instances.map(async instance => {
      const token = user.tokens[instance.name]
      if (!token) {
        throw new Error(
          `No auth token for user ${user.name} on instance ${instance.name}`
        )
      }

      const meRes = await req(instance.url, '/api/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const meBody = meRes.body as { data?: { teamToken?: string } }
      const teamToken = meBody.data?.teamToken
      if (!teamToken) {
        throw new Error(
          `No teamToken for user ${user.name} on instance ${instance.name}`
        )
      }

      return req(instance.url, '/api/v1/auth/login', {
        method: 'POST',
        body: { teamToken },
      })
    })
  )

  return Object.fromEntries(
    instances.map((i, idx) => [i.name, results[idx] as ApiResponse])
  )
}

export async function makeAdmin(user: TestUser): Promise<void> {
  for (const instance of instances) {
    const userId = user.ids[instance.name]
    if (!userId) {
      throw new Error(`No user ID for ${user.name} on ${instance.name}`)
    }
    await instance.db`UPDATE users SET perms = 7 WHERE id = ${userId}`

    const token = user.tokens[instance.name]
    if (!token) {
      throw new Error(`No auth token for user ${user.name} on ${instance.name}`)
    }

    // Invalidating user cache to make sure the updated perms field is reflected
    const division = user.divisions[instance.name]
    const res = await req(instance.url, '/api/v1/users/me', {
      method: 'PATCH',
      body: { division },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status !== 200) {
      throw new Error(
        `Failed to invalidate user cache for ${user.name} on ${instance.name}: ${JSON.stringify(res.body)}`
      )
    }
  }
}

export interface ChallengeData {
  name: string
  description: string
  category: string
  author: string
  flag: string
  points: { min: number; max: number }
  tiebreakEligible?: boolean
  files?: { name: string; url: string }[]
}

export async function createChallenge(
  admin: TestUser,
  id: string,
  data: ChallengeData
): Promise<AllResponses> {
  return allAs(admin, `/api/v1/admin/challs/${id}`, {
    method: 'PUT',
    body: { data },
  })
}

export async function deleteChallenge(
  admin: TestUser,
  id: string
): Promise<AllResponses> {
  return allAs(admin, `/api/v1/admin/challs/${id}`, {
    method: 'DELETE',
  })
}

export async function submitFlag(
  user: TestUser,
  challengeId: string,
  flag: string
): Promise<AllResponses> {
  return allAs(user, `/api/v1/challs/${challengeId}/submit`, {
    method: 'POST',
    body: { flag },
  })
}

export async function cleanupUser(user: TestUser): Promise<void> {
  for (const instance of instances) {
    const userId = user.ids[instance.name]
    if (userId) {
      await instance.db`DELETE FROM solves WHERE userid = ${userId}`
      await instance.db`DELETE FROM user_members WHERE userid = ${userId}`
      await instance.db`DELETE FROM users WHERE id = ${userId}`
    }
  }
}

export async function cleanupChallenge(id: string): Promise<void> {
  await allDb(async db => {
    await db`DELETE FROM solves WHERE challengeid = ${id}`
    await db`DELETE FROM challenges WHERE id = ${id}`
  })
}

export async function cleanupSolves(challengeId: string): Promise<void> {
  await allDb(async db => {
    await db`DELETE FROM solves WHERE challengeid = ${challengeId}`
  })
}

export async function snapshotLeaderboard(): Promise<Record<string, string>> {
  const res = await all('/api/v1/leaderboard/now?limit=100&offset=0')
  return Object.fromEntries(
    Object.entries(res).map(([name, r]) => [name, JSON.stringify(r.body)])
  )
}

export async function refreshLeaderboard(
  snapshot?: Record<string, string>,
  timeout = 15_000
): Promise<boolean> {
  if (!snapshot) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    return true
  }

  const start = Date.now()
  while (Date.now() - start < timeout) {
    const res = await all('/api/v1/leaderboard/now?limit=100&offset=0')
    const allChanged = Object.entries(snapshot).every(
      ([name, prev]) => JSON.stringify(res[name]?.body) !== prev
    )
    if (allChanged) return true
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // A recomputation can legitimately produce the same visible top-N response.
  return false
}

export async function awaitAllLeaderboard(
  predicate: (entries: { name: string; score: number }[]) => boolean,
  timeout = 15_000
): Promise<AllResponses> {
  const start = Date.now()
  let res: AllResponses = await all(
    '/api/v1/leaderboard/now?limit=100&offset=0'
  )
  while (Date.now() - start < timeout) {
    const allSatisfied = Object.values(res).every(r => {
      const body = r.body as {
        data?: { leaderboard?: { name: string; score: number }[] }
      }
      return predicate(body.data?.leaderboard ?? [])
    })
    if (allSatisfied) return res
    await new Promise(resolve => setTimeout(resolve, 250))
    res = await all('/api/v1/leaderboard/now?limit=100&offset=0')
  }
  return res
}

export function testId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
