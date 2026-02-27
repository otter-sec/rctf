import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import type { Hono } from 'hono'
import type { AppEnv } from '../../lib/app-env'
import { encodeKey, UploadProvider, type FileInfo } from './base'

interface S3ProviderOptions {
  bucketName: string
  awsKeyId: string
  awsKeySecret: string
  awsRegion: string
}

export default class S3Provider extends UploadProvider {
  private readonly client: S3Client
  private readonly bucketName: string
  private readonly region: string

  constructor(_options: Partial<S3ProviderOptions>) {
    super()

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

    this.client = new S3Client({
      region: options.awsRegion,
      credentials: {
        accessKeyId: options.awsKeyId,
        secretAccessKey: options.awsKeySecret,
      },
    })
    this.bucketName = options.bucketName
    this.region = options.awsRegion
  }

  override async startupWebPart(_app: Hono<AppEnv>): Promise<void> {}

  private getObjectKey(key: string): string {
    return `uploads/${key}`
  }

  private async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: this.getObjectKey(key),
        })
      )
      return true
    } catch (error: any) {
      if (
        error?.$metadata?.httpStatusCode === 404 ||
        error?.name === 'NotFound' ||
        error?.$metadata?.httpStatusCode === 403 ||
        error?.$metadata?.httpStatusCode === 301 // bucket redirect due to not existing
      ) {
        return false
      }
      throw error
    }
  }

  private toUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/uploads/${encodeKey(key)}`
  }

  override uploadFile = async (data: Buffer, key: string): Promise<string> => {
    if (!(await this.objectExists(key))) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: this.getObjectKey(key),
          Body: data,
          ACL: 'public-read',
          CacheControl: 'public, max-age=31536000, immutable',
          ContentDisposition: 'attachment',
        })
      )
    }

    return this.toUrl(key)
  }

  override deleteFile = async (key: string): Promise<void> => {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: this.getObjectKey(key),
      })
    )
  }

  override getFileUrl = async (key: string): Promise<string | null> => {
    const exists = await this.objectExists(key)
    if (!exists) {
      return null
    }
    return this.toUrl(key)
  }

  protected override extractKeyFromUrl(url: string): string | null {
    const match = url.match(/\.amazonaws\.com\/uploads\/(.+)$/)
    return match?.[1] ? decodeURIComponent(match[1]) : null
  }

  override getFileInfo = async (key: string): Promise<FileInfo> => {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: this.getObjectKey(key),
        })
      )
      return {
        url: this.toUrl(key),
        size: response.ContentLength ?? null,
      }
    } catch {
      return { url: null, size: null }
    }
  }
}
