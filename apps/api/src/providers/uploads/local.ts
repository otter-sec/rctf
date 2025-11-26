import fs from 'fs'
import path from 'path'
import type { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import type { AppEnv } from '../../lib/app-env'
import type { UploadProvider } from './base'

export default class LocalProvider implements UploadProvider {
  private readonly uploadDirectory: string

  constructor(_options: any) {
    const options = (_options || {}) as Partial<{ uploadDirectory: string }>
    this.uploadDirectory = path.resolve(
      options.uploadDirectory ?? path.join(process.cwd(), 'uploads')
    )
  }

  async startupWebPart(app: Hono<AppEnv>): Promise<void> {
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
        onNotFound: (path, ctx) => {
          console.log('not found', path)
        },
      })
    )
  }

  private getKey(hash: string, name: string): string {
    return `${hash}/${name}`
  }

  async upload(data: Buffer, name: string): Promise<string> {
    const hash = new Bun.SHA256().update(data).digest('hex')
    const key = this.getKey(hash, name)
    const filePath = path.resolve(path.join(this.uploadDirectory, key))

    const relative = path.relative(this.uploadDirectory, filePath)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Invalid file path')
    }

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
    await fs.promises.writeFile(filePath, data)

    return `/uploads/${key}`
  }

  async getUrl(sha256: string, name: string): Promise<string | null> {
    const key = this.getKey(sha256, name)
    try {
      await fs.promises.access(path.join(this.uploadDirectory, key))
    } catch {
      return null
    }
    return `/uploads/${key}`
  }
}
