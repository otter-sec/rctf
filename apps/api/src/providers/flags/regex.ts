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
    pattern: z.string().check(z.minLength(1)).register(z.globalRegistry, {
      format: 'regex',
      description: 'Add ^ and $ to require a full match',
    }),
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
    flagValue: z.optional(
      z.string().check(z.minLength(1)).register(z.globalRegistry, {
        description:
          'Concrete flag handed to per-team consumers such as the admin bot',
      })
    ),
  })
  .check(
    z.refine(config => compiles(config.pattern, config.flags), {
      message: 'Pattern does not compile with the given flags',
      path: ['flags'],
    }),
    z.refine(
      config => {
        if (config.flagValue === undefined) {
          return true
        }
        if (!compiles(config.pattern, config.flags)) {
          return true
        }
        return new RegExp(config.pattern, config.flags).test(config.flagValue)
      },
      {
        message: 'Flag value does not match the pattern',
        path: ['flagValue'],
      }
    )
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

  protected async getForTeamParsed(
    config: RegexFlagConfig
  ): Promise<string | null> {
    return config.flagValue ?? null
  }
}
