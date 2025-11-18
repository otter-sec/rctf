import type { UploadProvider } from './base'
import GCSProvider from './gcs'
import LocalProvider from './local'

type UploadProviderConstructor = (options: any) => UploadProvider
export const uploadProviders: Record<string, UploadProviderConstructor> = {
  'uploads/local': (options: any) => new LocalProvider(options),
  'uploads/gcs': (options: any) => new GCSProvider(options),
}
