import { z } from 'zod/mini'
import { timingSafeEqual } from '../../util/timing-safe-equal'
import { FlagProvider } from './base'

export const staticFlagConfigSchema = z.object({
  flag: z.string().check(z.minLength(1)),
})
export type StaticFlagConfig = z.output<typeof staticFlagConfigSchema>

export default class StaticFlagProvider extends FlagProvider {
  readonly configSchema = staticFlagConfigSchema
  protected async verifyParsed(
    config: StaticFlagConfig,
    submitted: string
  ): Promise<boolean> {
    return timingSafeEqual(config.flag, submitted)
  }
}
