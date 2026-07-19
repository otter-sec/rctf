import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3'
import type { Hono } from 'hono'
import type { AppEnv } from '../../lib/app-env'
import type { Csp } from '../base'
import { encodeKey, UploadProvider, type FileInfo } from './base'

interface S3CompatibleProviderOptions {
  client: S3Client
  bucketName: string
  publicBaseUrl: string
  acl?: PutObjectCommandInput['ACL']
}

const isObjectMissingError = (error: any): boolean =>
  error?.$metadata?.httpStatusCode === 404 ||
  error?.name === 'NotFound' ||
  error?.$metadata?.httpStatusCode === 301 // bucket redirect due to not existing

export default abstract class S3CompatibleProvider extends UploadProvider {
  private readonly client: S3Client
  private readonly bucket: string
  protected readonly publicBaseUrl: string
  private readonly acl: PutObjectCommandInput['ACL']

  protected constructor(options: S3CompatibleProviderOptions) {
    super()
    this.client = options.client
    this.bucket = options.bucketName
    this.publicBaseUrl = options.publicBaseUrl
    this.acl = options.acl
  }

  override async startupWebPart(_app: Hono<AppEnv>): Promise<void> {}

  override getCspRules(): Csp {
    return {
      // avatars downloading for screenshot mode
      'connect-src': [this.publicBaseUrl],
      // download all frontend button
      'frame-src': [this.publicBaseUrl],
    }
  }

  private getObjectKey(key: string): string {
    return `uploads/${key}`
  }

  private async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.getObjectKey(key),
        })
      )
      return true
    } catch (error: any) {
      if (isObjectMissingError(error)) {
        return false
      }
      throw error
    }
  }

  private toUrl(key: string): string {
    return `${this.publicBaseUrl}/uploads/${encodeKey(key)}`
  }

  override uploadFile = async (data: Buffer, key: string): Promise<string> => {
    if (!(await this.objectExists(key))) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.getObjectKey(key),
          Body: data,
          ACL: this.acl,
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
        Bucket: this.bucket,
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

  override getFileInfo = async (key: string): Promise<FileInfo> => {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.getObjectKey(key),
        })
      )
      return {
        url: this.toUrl(key),
        size: response.ContentLength ?? null,
      }
    } catch (error: any) {
      if (isObjectMissingError(error)) {
        return { url: null, size: null }
      }
      throw error
    }
  }
}
