import { regexString } from '@rctf/types'
import { z } from 'zod/mini'
import { FlagProvider } from './base'

const compiles = (pattern: string, flags?: string): boolean => {
  try {
    new RegExp(pattern, flags)
    return true
  } catch {
    return false
  }
}

export const regexFlagConfigSchema = z
  .object({
    pattern: regexString('Add ^ and $ to require a full match'),
    flags: z.optional(
      z
        .string()
        .check(
          z.regex(/^[dgimsuvy]*$/, {
            message: 'Invalid regular expression flags',
          }),
          z.refine(flags => compiles('', flags), {
            message: 'Invalid regular expression flags',
          })
        )
        .register(z.globalRegistry, {
          description: "e.g. 'i' for case-insensitive matching",
        })
    ),
  })
  .check(
    z.refine(config => compiles(config.pattern, config.flags), {
      message: 'Pattern does not compile with the given flags',
      path: ['flags'],
    })
  )
export type RegexFlagConfig = z.output<typeof regexFlagConfigSchema>

export default class RegexFlagProvider extends FlagProvider {
  readonly configSchema = regexFlagConfigSchema
  protected async verifyParsed(
    config: RegexFlagConfig,
    submitted: string
  ): Promise<boolean> {
    try {
      return new RegExp(config.pattern, config.flags).test(submitted)
    } catch {
      return false
    }
  }
}
