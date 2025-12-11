export interface MessageProvider {
  sendMarkdown: (message: string) => Promise<void>
  escapeText: (text: string) => string
  escapeUrl: (text: string) => string
}
