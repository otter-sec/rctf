import fs from 'fs'
import path from 'path'
import type { Hono } from 'hono'
import type { AppEnv } from '../../lib/app-env'
import type { Csp } from '../base'
import { encodeKey, UploadProvider, type FileInfo } from './base'

export default class LocalProvider extends UploadProvider {
  private readonly uploadDirectory: string

  constructor(_options: any) {
    super()
    const options = (_options || {}) as Partial<{ uploadDirectory: string }>
    this.uploadDirectory = path.resolve(
      options.uploadDirectory ?? path.join(process.cwd(), 'uploads')
    )
  }

  override getCspRules(): Csp {
    return {
      // download all frontend button
      'frame-src': ["'self'"],
    }
  }

  private resolveUploadPath(key: string): string {
    const filePath = path.resolve(path.join(this.uploadDirectory, key))
    const relative = path.relative(this.uploadDirectory, filePath)
    if (
      relative === '' ||
      relative.startsWith('..') ||
      path.isAbsolute(relative)
    ) {
      throw new Error('Invalid file path')
    }

    return filePath
  }

  override async startupWebPart(app: Hono<AppEnv>): Promise<void> {
    // hono's serveStatic decodes the path with decodeURI, which leaves
    // reserved characters (& ; + ...) percent-encoded and breaks lookups for
    // keys produced by encodeKey, so serve files with the exact inverse
    app.get('/uploads/*', async (c, next) => {
      let file: ReturnType<typeof Bun.file>
      try {
        const key = new URL(c.req.raw.url).pathname
          .split('/')
          .slice(2)
          .map(decodeURIComponent)
          .join('/')

        file = Bun.file(this.resolveUploadPath(key))
        if (!(await file.exists())) {
          return next()
        }
      } catch {
        return next()
      }

      c.header('content-type', file.type || 'application/octet-stream')
      c.header('cache-control', 'public, max-age=31557600, immutable')
      c.header('content-disposition', 'attachment')
      return c.body(file.stream())
    })
  }

  override uploadFile = async (data: Buffer, key: string): Promise<string> => {
    const filePath = this.resolveUploadPath(key)
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
    await fs.promises.writeFile(filePath, data)
    return `/uploads/${encodeKey(key)}`
  }

  override deleteFile = async (key: string): Promise<void> => {
    const filePath = this.resolveUploadPath(key)
    await fs.promises.unlink(filePath).catch(() => {})
  }

  override getFileUrl = async (key: string): Promise<string | null> => {
    try {
      await fs.promises.access(this.resolveUploadPath(key))
    } catch {
      return null
    }
    return `/uploads/${encodeKey(key)}`
  }

  override getFileInfo = async (key: string): Promise<FileInfo> => {
    try {
      const stats = await fs.promises.stat(this.resolveUploadPath(key))
      return {
        url: `/uploads/${encodeKey(key)}`,
        size: stats.size,
      }
    } catch {
      return { url: null, size: null }
    }
  }
}
