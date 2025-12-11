import type { ModerationProvider } from './base'
import OpenAIModerationProvider from './openai'

type ModerationConstructor = (options: any) => ModerationProvider
export const moderationProviders: Record<string, ModerationConstructor> = {
  'moderation/openai': (options: any) => new OpenAIModerationProvider(options),
}
