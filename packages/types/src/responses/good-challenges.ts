import { z } from 'zod/mini'
import { response } from '../internal'
import { omitWhenNull } from '../util'
import { example } from '../util/example'

export const GoodChallenges = response('goodChallenges', {
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
        })
      ),
      points: omitWhenNull(z.int()).check(z.describe('Current point value.')),
      solves: omitWhenNull(z.int()).check(z.describe('Solve count.')),
      sortWeight: omitWhenNull(z.number()).check(
        z.describe('Manual sort weight.')
      ),
    })
  ),
})
