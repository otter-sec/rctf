import type { MessageProvider } from './base'
import { z } from 'zod/mini'

export default class TelegramMessagesProvider implements MessageProvider {
  private readonly botToken: string
  private readonly chatId: number

  constructor(_options: any) {
    const options = _options as Partial<{
      botToken: string
      chatId: string | number
    }>
    if (!options.botToken || !options.chatId) {
      throw new Error(
        'Missing bot token or chat id. It can be set from the config via `botToken` and `chatId`.'
      )
    }

    this.botToken = options.botToken
    this.chatId = z.coerce.number().parse(options.chatId)
  }

  escapeText(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&')
  }

  escapeUrl(text: string): string {
    return text.replace(/[)\\]/g, '\\$&')
  }

  async sendMarkdown(message: string): Promise<void> {
    const resp = await fetch(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'MarkdownV2',
        }),
      }
    )

    if (resp.status != 200) {
      throw new Error(`Telegram error ${resp.status}: ${await resp.text()}`)
    }
  }
}
