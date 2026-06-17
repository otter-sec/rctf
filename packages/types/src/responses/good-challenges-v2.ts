import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'
import { ChallengeScoringKind } from '../util/schemas'

export const GoodChallengesV2 = response('goodChallengesV2', {
  status: 200,
  message: 'The retrieval of challenges was successful.',
  data: z.array(
    z.object({
      id: z.string().check(z.describe('Challenge ID.')),
      name: example(z.string(), 'baby-rev').check(z.describe('Display name.')),
      description: example(
        z.string(),
        'A small reverse engineering challenge.'
      ).check(z.describe('Markdown challenge description.')),
      category: example(z.string(), 'rev').check(z.describe('Category name.')),
      author: example(z.string(), 'es3n1n').check(
        z.describe('Author display name.')
      ),
      files: z.array(
        z.object({
          name: example(z.string(), 'chall.zip').check(
            z.describe('File name.')
          ),
          url: z.string().check(z.describe('Download URL.')),
          size: z.nullable(z.int()).check(z.describe('File size in bytes.')),
        })
      ),
      points: example(z.int(), 487).check(
        z.describe('Current score after dynamic scoring.')
      ),
      solves: example(z.int(), 12).check(z.describe('Current solve count.')),
      sortWeight: z
        .nullable(z.number())
        .check(z.describe('Optional ordering weight.')),
      tags: z
        .nullable(z.array(z.string()))
        .check(z.describe('Challenge tags shown to players.')),
      instancerLifetime: z
        .nullable(z.number())
        .check(
          z.describe(
            'Instance timeout in milliseconds when the challenge has instancer config and an instancer is enabled.'
          )
        ),
      instancerExtendable: z
        .boolean()
        .check(
          z.describe(
            '`false{:ts}` when the challenge disables extension or the instancer does not support it.'
          )
        ),
      instancerStoppable: z
        .boolean()
        .check(
          z.describe(
            '`false{:ts}` when the instancer does not support stopping an instance.'
          )
        ),
      instancerActions: z
        .array(
          z.object({
            id: example(z.string(), 'restart').check(
              z.describe('Stable action identifier sent back to the instancer.')
            ),
            label: example(z.string(), 'Restart').check(
              z.describe('Button label shown to players.')
            ),
          })
        )
        .check(
          z.describe('Provider-defined instancer actions shown as buttons.')
        ),
      adminBotInputs: example(
        z.nullish(
          z.record(
            z.string(),
            z.object({ pattern: z.string(), flags: z.optional(z.string()) })
          )
        ),
        { url: { pattern: '^https?://', flags: 'i' } }
      ).check(z.describe('Participant input schema for admin-bot challenges.')),
      hasFlag: example(z.boolean(), true).check(
        z.describe('Whether the challenge has a flag configured.')
      ),
      scoringKind: z
        .optional(z.enum(ChallengeScoringKind))
        .check(z.describe('Scoring kind: decay, static, or dynamic.')),
      yourScore: z
        .optional(z.int())
        .check(
          z.describe(
            "Caller's current points for this challenge. Present when the user has a solve (or feed entry) for it."
          )
        ),
      yourPointDelta: z
        .optional(z.int())
        .check(
          z.describe(
            "Caller's latest dynamic point delta for this challenge. Present for dynamic challenges when the caller had an entry in the latest feed tick."
          )
        ),
    })
  ),
})
