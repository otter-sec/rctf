import fs from 'fs'
import path from 'path'
import { Bucket, File, Storage } from '@google-cloud/storage'
import type { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import type { AppEnv } from '../../lib/app-env'
import type { UploadProvider } from './base'

interface GcsProviderOptions {
  projectId: string
  bucketName: string
  credentials: Record<string, unknown>
}

export default class GcsProvider implements UploadProvider {
  private readonly bucket: Bucket
  private readonly bucketName: string

  constructor(_options: Partial<GcsProviderOptions>) {
    const options = {
      projectId: process.env.RCTF_GCS_PROJECT_ID ?? _options.projectId,
      bucketName: process.env.RCTF_GCS_BUCKET ?? _options.bucketName,
      credentials:
        process.env.RCTF_GCS_CREDENTIALS === undefined
          ? _options.credentials
          : (JSON.parse(
              process.env.RCTF_GCS_CREDENTIALS
            ) as GcsProviderOptions['credentials']),
    } as GcsProviderOptions

    if (!options.projectId || !options.bucketName) {
      throw new Error(
        `Missing one of the projectId or bucketName for the GCS upload provider.`
      )
    }

    const storage = new Storage({
      projectId: options.projectId,
      credentials: options.credentials,
    })
    this.bucket = new Bucket(storage, options.bucketName)
    this.bucketName = options.bucketName
  }

  async startupWebPart(_app: Hono<AppEnv>): Promise<void> {}

  private readonly getGcsFile = (sha256: string, name: string): File => {
    const key = `uploads/${sha256}/${name}`
    const file = this.bucket.file(key)
    return file
  }

  async upload(data: Buffer, name: string): Promise<string> {
    const hash = new Bun.SHA256().update(data).digest('hex')
    const file = this.getGcsFile(hash, name)
    const exists = (await file.exists())[0]

    if (!exists) {
      await file.save(data, {
        public: true,
        resumable: false,
        metadata: {
          contentDisposition: 'download',
        },
      })
    }

    return this.toUrl(hash, name)
  }

  private toUrl(sha256: string, name: string): string {
    return `https://${
      this.bucketName
    }.storage.googleapis.com/uploads/${sha256}/${encodeURIComponent(name)}`
  }

  async getUrl(sha256: string, name: string): Promise<string | null> {
    const file = this.getGcsFile(sha256, name)

    const exists = (await file.exists())[0]
    if (!exists) return null

    return this.toUrl(sha256, name)
  }
}
