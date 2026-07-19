import { BaseProvider } from '../base'

export abstract class ModerationProvider extends BaseProvider {
  abstract checkWebpImage(buffer: Buffer): Promise<boolean>
}
