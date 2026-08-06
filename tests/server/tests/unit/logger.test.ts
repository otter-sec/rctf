import { DrizzleQueryError } from 'drizzle-orm'
import { expect, test } from 'bun:test'
import { createApiLogger } from '../../../../apps/api/src/lib/logger'
import { collectStream } from '../../../util'

test('redacts query parameters and sensitive fields from serialized logs', async () => {
  const { destination, read } = collectStream()
  const logger = createApiLogger(destination, 'info')
  const secret = 'flag{database-error-secret}'
  const cause = Object.assign(new Error(`duplicate value ${secret}`), {
    code: '23505',
    constraint_name: 'submissions_pkey',
  })
  const error = new DrizzleQueryError(
    'insert into submissions (details) values ($1)',
    [secret],
    cause
  )

  logger.error({ err: error }, 'query failed')
  logger.error(
    {
      error: new Error(`wrapped query failure ${secret}`, { cause: error }),
    },
    'wrapped query failed'
  )
  logger.info(
    {
      input: secret,
      inputs: secret,
      submittedFlag: secret,
      details: { submittedFlag: secret },
    },
    'sensitive fields'
  )
  const output = await read()

  expect(output).toContain('Failed query: insert into submissions')
  expect(output).toContain('DrizzleQueryError')
  expect(output).toContain('23505')
  expect(output).toContain('submissions_pkey')
  expect(output).not.toContain(secret)
})
