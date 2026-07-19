import { MessageProvider } from './base'

export default class DiscordMessagesProvider extends MessageProvider {
  private readonly url: string

  constructor(_options: any) {
    super()
    const options = _options as Partial<{ url: string }>
    if (!options.url) {
      throw new Error(
        'Missing discord webhook url. It can be set from the config via `url`.'
      )
    }

    this.url = options.url
  }

  escapeText(text: string): string {
    return text.replace(/[_*~`|\\<>:![\]()]/g, '\\$&')
  }

  escapeUrl(text: string): string {
    return text
  }

  async sendMarkdown(message: string): Promise<void> {
    const resp = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        allowed_mentions: { parse: [] },
      }),
    })

    if (!resp.ok) {
      throw new Error(`Discord error ${resp.status}: ${await resp.text()}`)
    }
  }
}
