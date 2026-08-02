import { Writable } from 'node:stream'
import { expect, test } from 'bun:test'
import { createRootLogger } from '../../../../apps/admin-bot/src/core/logger'

test('redacts participant inputs and flags from serialized logs', async () => {
  let output = ''
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString()
      callback()
    },
  })
  const logger = createRootLogger(destination, 'info')
  const secrets = {
    childInput: 'child-input-secret',
    childFlag: 'flag{child-secret}',
    topLevelFlag: 'flag{top-level-secret}',
    topLevelInput: 'top-level-input-secret',
    nestedJobFlag: 'flag{nested-job-secret}',
  }

  logger
    .child({
      input: { url: secrets.childInput },
      job: {
        flag: secrets.childFlag,
        flags: [{ provider: 'flags/static', flag: secrets.childFlag }],
      },
    })
    .info(
      {
        marker: 'safe-log-marker',
        flag: secrets.topLevelFlag,
        flags: [{ provider: 'flags/static', flag: secrets.topLevelFlag }],
        inputs: { url: secrets.topLevelInput },
        job: {
          flag: secrets.nestedJobFlag,
          flags: [{ provider: 'flags/static', flag: secrets.nestedJobFlag }],
          inputs: { url: secrets.topLevelInput },
        },
      },
      'sensitive logging test'
    )

  await new Promise<void>(resolve => destination.end(resolve))

  expect(output).toContain('safe-log-marker')
  for (const secret of Object.values(secrets)) {
    expect(output).not.toContain(secret)
  }
})
