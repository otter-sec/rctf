import { env } from '$env/dynamic/private'

const base = (env.RCTF_API_BASE ?? '').replace(/\/$/, '')
const token = env.RCTF_API_TOKEN ?? ''

if (!base || !token) {
  throw new Error('Missing RCTF_API_BASE or RCTF_API_TOKEN!')
}

type QueryParams = Record<string, string | number | boolean | undefined>

interface ApiResponse<T> {
  readonly data: T
}

export async function apiGet<T>(path: string, query?: QueryParams): Promise<T> {
  const url = new URL(`${base}${path}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `API request failed: ${res.status} ${res.statusText}${body ? `\n${body}` : ''}`
    )
  }

  const payload = (await res.json()) as ApiResponse<T> | T
  return typeof payload === 'object' && payload !== null && 'data' in payload
    ? (payload as ApiResponse<T>).data
    : (payload as T)
}
