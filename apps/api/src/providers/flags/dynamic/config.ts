import { z } from 'zod/mini'
import {
  DYNAMIC_FLAG_MIN_BITS,
  DynamicFlagExhaustion,
  DynamicFlagMode,
  parseDynamicFlag,
} from './format'
import { leetCapable } from './leet'

export const dynamicFlagConfigSchema = z
  .strictObject({
    base: z.string().check(z.minLength(1)).register(z.globalRegistry, {
      description: 'Base flag the per-team randomness is encoded into',
    }),
    mode: z
      ._default(z.enum(DynamicFlagMode), DynamicFlagMode.AUTO)
      .register(z.globalRegistry, {
        description:
          'auto uses leet when the base has capacity and tail otherwise',
      }),
    exhaustion: z
      ._default(z.enum(DynamicFlagExhaustion), DynamicFlagExhaustion.TAIL)
      .register(z.globalRegistry, {
        description: 'What to do once every leet variant is taken',
      }),
  })
  .check(
    z.refine(config => parseDynamicFlag(config.base) !== null, {
      message: 'Base must use the prefix{content} flag format',
      path: ['base'],
    }),
    z.refine(
      config =>
        config.mode !== DynamicFlagMode.LEET ||
        leetCapable(parseDynamicFlag(config.base)?.content ?? ''),
      {
        message: `Leet mode requires at least ${DYNAMIC_FLAG_MIN_BITS} encodable characters`,
        path: ['base'],
      }
    )
  )
export type DynamicFlagConfig = z.output<typeof dynamicFlagConfigSchema>
