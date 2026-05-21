import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodChallengesV2 = response('goodChallenges', {
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
            '`false{:ts}` only when challenge config explicitly disables extension.'
          )
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
    })
  ),
})
