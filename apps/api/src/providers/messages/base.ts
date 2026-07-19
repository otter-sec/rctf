import { BaseProvider } from '../base'

export abstract class MessageProvider extends BaseProvider {
  abstract sendMarkdown(message: string): Promise<void>
  abstract escapeText(text: string): string
  abstract escapeUrl(text: string): string
}
