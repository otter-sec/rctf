import { Storage, Bucket, File } from '@google-cloud/storage'
import crypto from 'crypto'
import { Provider } from '../../../uploads/provider'

interface GcsProviderOptions {
  projectId: string
  bucketName: string
  credentials: Record<string, unknown>
}

export default class GcsProvider implements Provider {
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
    // TODO: validate that all options are indeed provided

    const storage = new Storage({
      projectId: options.projectId,
      credentials: options.credentials,
    })
    this.bucket = new Bucket(storage, options.bucketName)
    this.bucketName = options.bucketName
  }

  private readonly getGcsFile = (sha256: string, name: string): File => {
    const key = `uploads/${sha256}/${name}`
    const file = this.bucket.file(key)
    return file
  }

  upload = async (data: Buffer, name: string): Promise<string> => {
    const hash = crypto.createHash('sha256').update(data).digest('hex')
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
