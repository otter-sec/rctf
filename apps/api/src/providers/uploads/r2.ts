import { S3Client } from '@aws-sdk/client-s3'
import S3CompatibleProvider from './s3-compatible'

interface R2ProviderOptions {
  bucketName: string
  cfAccountId: string
  cfKeyId: string
  cfKeySecret: string
  publicBaseUrl: string
}

export default class R2Provider extends S3CompatibleProvider {
  constructor(_options: Partial<R2ProviderOptions>) {
    const options = {
      bucketName: process.env.RCTF_R2_BUCKET ?? _options.bucketName,
      cfAccountId: process.env.RCTF_R2_ACCOUNT_ID ?? _options.cfAccountId,
      cfKeyId: process.env.RCTF_R2_KEY_ID ?? _options.cfKeyId,
      cfKeySecret: process.env.RCTF_R2_KEY_SECRET ?? _options.cfKeySecret,
      publicBaseUrl:
        process.env.RCTF_R2_PUBLIC_BASE_URL ?? _options.publicBaseUrl,
    } as R2ProviderOptions

    if (
      !options.bucketName ||
      !options.cfAccountId ||
      !options.cfKeyId ||
      !options.cfKeySecret ||
      !options.publicBaseUrl
    ) {
      throw new Error(
        'Missing one of the bucketName, cfAccountId, cfKeyId, cfKeySecret or publicUrl for the R2 upload provider.'
      )
    }

    super({
      client: new S3Client({
        region: 'auto',
        endpoint: `https://${options.cfAccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: options.cfKeyId,
          secretAccessKey: options.cfKeySecret,
        },
      }),
      bucketName: options.bucketName,
      publicBaseUrl: options.publicBaseUrl.replace(/\/+$/, ''),
    })
  }

  protected override extractKeyFromUrl(url: string): string | null {
    const prefix = `${this.publicBaseUrl}/uploads/`
    if (!url.startsWith(prefix)) {
      return null
    }

    const key = url.slice(prefix.length)
    return key ? decodeURIComponent(key) : null
  }
}
