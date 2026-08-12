import { config } from '@rctf/config'
import { messagesProviders } from '../messages'
import { loadProvider } from './load'

export const bloodBotProviders = config.bloodBot?.destinations.map(
  ({ provider }) => loadProvider(messagesProviders, provider)!
)
