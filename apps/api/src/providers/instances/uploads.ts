import { config } from '@rctf/config'
import { uploadProviders } from '../uploads'
import { loadProvider } from './load'

export const uploadProvider = loadProvider(
  uploadProviders,
  config.uploadProvider
)!
