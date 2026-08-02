import { Writable } from 'node:stream'
import { DrizzleQueryError } from 'drizzle-orm'
import { expect, test } from 'bun:test'
import { createApiLogger } from '../../../../apps/api/src/lib/logger'

test('redacts query parameters and sensitive fields from serialized logs', async () => {
  let output = ''
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString()
      callback()
    },
  })
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
  logger.info(
    {
      input: secret,
      inputs: secret,
      submittedFlag: secret,
      details: { submittedFlag: secret },
    },
    'sensitive fields'
  )
  await new Promise<void>(resolve => destination.end(resolve))

  expect(output).toContain('Database query failed')
  expect(output).toContain('DrizzleQueryError')
  expect(output).toContain('23505')
  expect(output).toContain('submissions_pkey')
  expect(output).not.toContain('insert into submissions')
  expect(output).not.toContain(secret)
})
