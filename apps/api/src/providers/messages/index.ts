import type { MessageProvider } from './base'
import DiscordMessagesProvider from './discord'
import TelegramMessagesProvider from './telegram'

type MessagesConstructor = (options: any) => MessageProvider
export const messagesProviders: Record<string, MessagesConstructor> = {
  'messages/discord': (options: any) => new DiscordMessagesProvider(options),
  'messages/telegram': (options: any) => new TelegramMessagesProvider(options),
}
