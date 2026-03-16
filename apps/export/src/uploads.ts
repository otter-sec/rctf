import { mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import type { UploadUrl } from './discovery.ts'
import type { Fetcher } from './fetcher.ts'

export async function downloadUploads(options: {
  fetcher: Fetcher
  outputDir: string
  uploadUrls: UploadUrl[]
  apiUrl: string
}): Promise<Map<string, string>> {
  const { fetcher, outputDir, uploadUrls, apiUrl } = options
  const urlMap = new Map<string, string>()
  const seen = new Set<string>()

  const deduplicated = uploadUrls.filter(u => {
    if (seen.has(u.originalUrl)) {
      return false
    }

    seen.add(u.originalUrl)
    return true
  })

  console.log(`  Downloading ${deduplicated.length} uploads...`)

  const downloads = deduplicated.map(async upload => {
    try {
      if (upload.type === 'relative') {
        const localPath = join(outputDir, upload.originalUrl)
        await mkdir(dirname(localPath), { recursive: true })

        const response = await fetcher.fetchRaw(
          `${apiUrl}${upload.originalUrl}`
        )
        await Bun.write(localPath, await response.arrayBuffer())
        urlMap.set(upload.originalUrl, upload.originalUrl)
      } else {
        const hash = new Bun.CryptoHasher('sha256')
          .update(upload.originalUrl)
          .digest('hex')
          .slice(0, 8)

        const urlObj = new URL(upload.originalUrl)
        const filename = urlObj.pathname.split('/').pop() || 'file'
        const localRelPath = `/uploads/external/${hash}/${filename}`
        const localPath = join(outputDir, localRelPath)
        await mkdir(dirname(localPath), { recursive: true })

        const response = await fetcher.fetchRaw(upload.originalUrl)
        await Bun.write(localPath, await response.arrayBuffer())
        urlMap.set(upload.originalUrl, localRelPath)
      }
    } catch (err) {
      console.error(`  Failed to download: ${upload.originalUrl}`, err)
    }
  })

  await Promise.all(downloads)
  return urlMap
}
