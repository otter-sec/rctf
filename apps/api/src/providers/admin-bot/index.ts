import type { AdminBotProvider } from './base'
import RctfJsProvider from './rctf-js'

type AdminBotProviderConstructor = (options: any) => AdminBotProvider
export const adminBotProviders: Record<string, AdminBotProviderConstructor> = {
  'admin-bot/rctf-js': (options: any) => new RctfJsProvider(options),
}
