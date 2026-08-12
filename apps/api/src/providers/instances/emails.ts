import { config } from '@rctf/config'
import { emailProviders } from '../emails'
import { loadProvider } from './load'

export const emailProvider = loadProvider(
  emailProviders,
  config.email?.provider
)
