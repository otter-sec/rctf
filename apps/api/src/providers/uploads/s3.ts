import { S3Client } from '@aws-sdk/client-s3'
import S3CompatibleProvider from './s3-compatible'

interface S3ProviderOptions {
  bucketName: string
  awsKeyId: string
  awsKeySecret: string
  awsRegion: string
}

export default class S3Provider extends S3CompatibleProvider {
  constructor(_options: Partial<S3ProviderOptions>) {
    const options = {
      bucketName: process.env.RCTF_S3_BUCKET ?? _options.bucketName,
      awsKeyId: process.env.RCTF_S3_KEY_ID ?? _options.awsKeyId,
      awsKeySecret: process.env.RCTF_S3_KEY_SECRET ?? _options.awsKeySecret,
      awsRegion: process.env.RCTF_S3_REGION ?? _options.awsRegion,
    } as S3ProviderOptions

    if (
      !options.bucketName ||
      !options.awsKeyId ||
      !options.awsKeySecret ||
      !options.awsRegion
    ) {
      throw new Error(
        'Missing one of the bucketName, awsKeyId, awsKeySecret or awsRegion for the S3 upload provider.'
      )
    }

    super({
      client: new S3Client({
        region: options.awsRegion,
        credentials: {
          accessKeyId: options.awsKeyId,
          secretAccessKey: options.awsKeySecret,
        },
      }),
      bucketName: options.bucketName,
      publicBaseUrl: `https://${options.bucketName}.s3.${options.awsRegion}.amazonaws.com`,
      acl: 'public-read',
    })
  }

  protected override extractKeyFromUrl(url: string): string | null {
    const match = url.match(/\.amazonaws\.com\/uploads\/(.+)$/)
    return match?.[1] ? decodeURIComponent(match[1]) : null
  }
}
