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

  async getForTeam(
    config: FlagProviderConfig,
    team: string
  ): Promise<string | null> {
    const parsed = this.configSchema.safeParse(config)
    if (!parsed.success) {
      return null
    }
    return await this.getForTeamParsed(parsed.data, team)
  }

  protected abstract verifyParsed(
    config: FlagProviderConfig,
    submitted: string
  ): Promise<boolean>

  protected abstract getForTeamParsed(
    config: FlagProviderConfig,
    team: string
  ): Promise<string | null>
}
