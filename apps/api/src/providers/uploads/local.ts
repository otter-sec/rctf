import fs from 'fs'
import path from 'path'
import type { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import type { AppEnv } from '../../lib/app-env'
import { encodeKey, UploadProvider } from './base'

export default class LocalProvider extends UploadProvider {
  private readonly uploadDirectory: string

  constructor(_options: any) {
    super()
    const options = (_options || {}) as Partial<{ uploadDirectory: string }>
    this.uploadDirectory = path.resolve(
      options.uploadDirectory ?? path.join(process.cwd(), 'uploads')
    )
  }

  override async startupWebPart(app: Hono<AppEnv>): Promise<void> {
    app.use(
      '/uploads/*',
      serveStatic({
        root: this.uploadDirectory,
        precompressed: true,
        rewriteRequestPath: p => p.replace(/^\/uploads/, ''),
        onFound: (_path, ctx) => {
          ctx.res.headers.set(
            'cache-control',
            'public, max-age=31557600, immutable'
          )
          ctx.res.headers.set('content-disposition', 'attachment')
        },
      })
    )
  }

  override uploadFile = async (data: Buffer, key: string): Promise<string> => {
    const filePath = path.resolve(path.join(this.uploadDirectory, key))
    const relative = path.relative(this.uploadDirectory, filePath)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Invalid file path')
    }

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
    await fs.promises.writeFile(filePath, data)
    return `/uploads/${encodeKey(key)}`
  }

  override getFileUrl = async (key: string): Promise<string | null> => {
    try {
      await fs.promises.access(path.join(this.uploadDirectory, key))
    } catch {
      return null
    }
    return `/uploads/${encodeKey(key)}`
  }
}
