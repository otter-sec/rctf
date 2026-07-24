import { z } from 'zod/mini'
import { BaseProvider } from '../base'

export type FlagProviderConfig = Record<string, unknown>

export abstract class FlagProvider extends BaseProvider {
  abstract readonly configSchema: z.ZodMiniType<FlagProviderConfig, unknown>

  async verify(
    config: FlagProviderConfig,
    submitted: string
  ): Promise<boolean> {
    const parsed = this.configSchema.safeParse(config)
    if (!parsed.success) {
      return false
    }
    return await this.verifyParsed(parsed.data, submitted)
  }

  protected abstract verifyParsed(
    config: FlagProviderConfig,
    submitted: string
  ): Promise<boolean>
}
