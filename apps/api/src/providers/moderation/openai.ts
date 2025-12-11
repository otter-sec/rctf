import type { ModerationProvider } from './base'
import OpenAI, { type ClientOptions } from 'openai'

export default class OpenAIModerationProvider implements ModerationProvider {
  private readonly client: OpenAI
  private readonly model: string

  constructor(_options: any) {
    const options = _options as Partial<ClientOptions & { model: string }>

    const apiKey =
      process.env.RCTF_MODERATION_OPENAI_API_KEY ??
      options.apiKey ??
      process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(
        'Missing OpenAI API key. It can be set from the config via `apiKey` or with the `RCTF_MODERATION_OPENAI_API_KEY` env var.'
      )
    }

    this.model =
      process.env.RCTF_MODERATION_OPENAI_MODEL ??
      options.model ??
      'omni-moderation-latest'
    this.client = new OpenAI({
      ...options,
      apiKey,
    })
  }

  async checkWebpImage(buffer: Buffer): Promise<boolean> {
    const moderation = await this.client.moderations.create({
      model: this.model,
      input: [
        {
          type: 'image_url',
          image_url: {
            url: `data:image/webp;base64,${buffer.toString('base64')}`,
          },
        },
      ],
    })
    return !moderation.results[0]?.flagged
  }
}
