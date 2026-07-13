import type { AdminBotProvider } from './base'
import RctfTsProvider from './rctf-ts'

type AdminBotProviderConstructor = (options: any) => AdminBotProvider
export const adminBotProviders: Record<string, AdminBotProviderConstructor> = {
  'admin-bots/rctf-ts': (options: any) => new RctfTsProvider(options),
}
