import { Bucket, File, Storage } from '@google-cloud/storage'
import type { Hono } from 'hono'
import type { AppEnv } from '../../lib/app-env'
import { encodeKey, UploadProvider, type FileInfo } from './base'

interface GcsProviderOptions {
  projectId: string
  bucketName: string
  credentials: Record<string, unknown>
}

export default class GcsProvider extends UploadProvider {
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
    super()
    this.bucket = new Bucket(storage, options.bucketName)
    this.bucketName = options.bucketName
  }

  private readonly getGcsFile = (key: string): File => {
    return this.bucket.file(`uploads/${key}`)
  }

  private toUrl(key: string): string {
    return `https://${this.bucketName}.storage.googleapis.com/uploads/${encodeKey(key)}`
  }

  override async startupWebPart(_app: Hono<AppEnv>): Promise<void> {}

  override uploadFile = async (data: Buffer, key: string): Promise<string> => {
    const file = this.getGcsFile(key)
    const exists = (await file.exists())[0]

    if (!exists) {
      await file.save(data, {
        public: true,
        resumable: false,
        metadata: {
          contentDisposition: 'attachment',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      })
    }

    return this.toUrl(key)
  }

  override deleteFile = async (key: string): Promise<void> => {
    const file = this.getGcsFile(key)
    await file.delete({ ignoreNotFound: true })
  }

  override getFileUrl = async (key: string): Promise<string | null> => {
    const file = this.getGcsFile(key)
    const exists = (await file.exists())[0]
    if (!exists) {
      return null
    }
    return this.toUrl(key)
  }

  protected override extractKeyFromUrl(url: string): string | null {
    const match = url.match(/\.storage\.googleapis\.com\/uploads\/(.+)$/)
    return match?.[1] ? decodeURIComponent(match[1]) : null
  }

  override getFileInfo = async (key: string): Promise<FileInfo> => {
    const file = this.getGcsFile(key)
    try {
      const [metadata] = await file.getMetadata()
      return {
        url: this.toUrl(key),
        size:
          typeof metadata.size === 'string'
            ? parseInt(metadata.size, 10)
            : (metadata.size ?? null),
      }
    } catch {
      return { url: null, size: null }
    }
  }
}
