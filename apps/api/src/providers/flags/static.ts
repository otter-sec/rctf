import { z } from 'zod/mini'
import { timingSafeEqual } from '../../util/timing-safe-equal'
import { FlagProvider, FlagVerifyStatus, type FlagVerifyResult } from './base'

export const staticFlagConfigSchema = z.strictObject({
  flag: z.string().check(z.minLength(1)),
})
export type StaticFlagConfig = z.output<typeof staticFlagConfigSchema>

export default class StaticFlagProvider extends FlagProvider {
  readonly configSchema = staticFlagConfigSchema
  protected async verifyParsed(
    config: StaticFlagConfig,
    submitted: string
  ): Promise<FlagVerifyResult> {
    return {
      status: timingSafeEqual(config.flag, submitted)
        ? FlagVerifyStatus.ACCEPTED
        : FlagVerifyStatus.REJECTED,
    }
  }

  protected async getForTeamParsed(
    config: StaticFlagConfig
  ): Promise<string | null> {
    return config.flag
  }
}
