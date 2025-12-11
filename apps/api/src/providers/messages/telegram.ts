import type { MessageProvider } from './base'

export default class TelegramMessagesProvider implements MessageProvider {
  private readonly botToken: string
  private readonly chatId: string | number
  private readonly threadId: number | undefined

  constructor(_options: any) {
    const options = _options as Partial<{
      botToken: string
      chatId: string | number
      threadId: number
    }>
    if (!options.botToken || !options.chatId) {
      throw new Error(
        'Missing bot token or chat id. It can be set from the config via `botToken` and `chatId`.'
      )
    }

    this.botToken = options.botToken
    this.chatId = options.chatId
    this.threadId = options.threadId
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
          message_thread_id: this.threadId,
        }),
      }
    )

    if (resp.status != 200) {
      throw new Error(`Telegram error ${resp.status}: ${await resp.text()}`)
    }
  }
}
