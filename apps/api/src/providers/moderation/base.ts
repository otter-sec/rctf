export interface ModerationProvider {
  checkWebpImage: (buffer: Buffer) => Promise<boolean>
}
