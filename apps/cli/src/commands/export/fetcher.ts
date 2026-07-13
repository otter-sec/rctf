import { writeApiResponse } from './writer.ts'

type FetchResult = {
  url: string
  data: unknown
  ok: boolean
}
type Fetcher = ReturnType<typeof createFetcher>
export type { Fetcher, FetchResult }

export function createFetcher(
  apiUrl: string,
  concurrency: number,
  outputDir: string
) {
  let active = 0
  const queue: (() => void)[] = []

  function release() {
    active--
    const next = queue.shift()
    if (next) {
      active++
      next()
    }
  }

  function acquire(): Promise<void> {
    if (active < concurrency) {
      active++
      return Promise.resolve()
    }
    return new Promise<void>(resolve => {
      queue.push(resolve)
    })
  }

  function resolveUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    return `${apiUrl}${path.startsWith('/') ? '' : '/'}${path}`
  }

  async function fetchJson(path: string): Promise<FetchResult> {
    const url = resolveUrl(path)
    await acquire()
    try {
      return await fetchWithRetry(url)
    } finally {
      release()
    }
  }

  async function fetchRaw(path: string): Promise<Response> {
    const url = resolveUrl(path)
    await acquire()
    try {
      return await fetchRawWithRetry(url)
    } finally {
      release()
    }
  }

  async function fetchWithRetry(
    url: string,
    retries = 3
  ): Promise<FetchResult> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(url)
        const data = await res.json()
        return { url, data, ok: res.ok }
      } catch {
        if (attempt < retries - 1) {
          const delay = 1000 * Math.pow(2, attempt)
          console.log(`  Retry ${attempt + 1} for ${url} in ${delay}ms`)
          await new Promise(r => setTimeout(r, delay))
        } else {
          console.error(`  Failed after ${retries} attempts: ${url}`)
          return { url, data: null, ok: false }
        }
      }
    }
    return { url, data: null, ok: false }
  }

  async function fetchRawWithRetry(
    url: string,
    retries = 3
  ): Promise<Response> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(url)
        if (res.ok) return res
        if (attempt < retries - 1) {
          const delay = 1000 * Math.pow(2, attempt)
          console.log(`  Retry ${attempt + 1} for ${url} in ${delay}ms`)
          await new Promise(r => setTimeout(r, delay))
        }
      } catch {
        if (attempt < retries - 1) {
          const delay = 1000 * Math.pow(2, attempt)
          console.log(`  Retry ${attempt + 1} for ${url} in ${delay}ms`)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }
    throw new Error(`Failed after ${retries} attempts: ${url}`)
  }

  async function fetchAndWrite(apiPath: string): Promise<FetchResult> {
    const result = await fetchJson(apiPath)
    if (result.ok) {
      await writeApiResponse(outputDir, apiPath, result.data)
    }
    return result
  }

  return { fetchJson, fetchRaw, fetchAndWrite, resolveUrl }
}
