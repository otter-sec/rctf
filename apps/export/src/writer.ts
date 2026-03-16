import { mkdir } from 'fs/promises'
import { dirname, join } from 'path'

export function apiUrlToFilePath(apiPath: string): string {
  const stripped = apiPath.replace(/^\/api\//, '')
  const questionIdx = stripped.indexOf('?')

  if (questionIdx === -1) {
    return `api-data/${stripped}.json`
  }

  const pathname = stripped.slice(0, questionIdx)
  const searchStr = stripped.slice(questionIdx + 1)
  const params = new URLSearchParams(searchStr)
  const sorted: string[] = []
  const keys = [...params.keys()].sort()
  for (const key of keys) {
    sorted.push(`${key}=${params.get(key)}`)
  }

  const qs = sorted.join('&')
  return `api-data/${pathname}/${qs}.json`
}

export async function writeApiResponse(
  outputDir: string,
  apiPath: string,
  data: unknown
): Promise<void> {
  const filePath = join(outputDir, apiUrlToFilePath(apiPath))
  await mkdir(dirname(filePath), { recursive: true })
  await Bun.write(filePath, JSON.stringify(data))
}

export async function writeDump(
  outputDir: string,
  relativePath: string,
  data: unknown
): Promise<void> {
  const filePath = join(outputDir, 'api-data', relativePath)
  await mkdir(dirname(filePath), { recursive: true })
  await Bun.write(filePath, JSON.stringify(data))
}
