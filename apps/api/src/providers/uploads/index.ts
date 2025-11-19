import type { UploadProvider } from './base'
import GCSProvider from './gcs'
import LocalProvider from './local'
import S3Provider from './s3'

type UploadProviderConstructor = (options: any) => UploadProvider
export const uploadProviders: Record<string, UploadProviderConstructor> = {
  'uploads/local': (options: any) => new LocalProvider(options),
  'uploads/gcs': (options: any) => new GCSProvider(options),
  'uploads/s3': (options: any) => new S3Provider(options),
}
