import { config } from '@rctf/config'
import { moderationProviders } from '../moderation'
import { loadProvider } from './load'

export const avatarModerationProvider = loadProvider(
  moderationProviders,
  config.avatarsModeration?.provider
)
