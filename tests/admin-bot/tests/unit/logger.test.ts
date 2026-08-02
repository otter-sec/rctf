import { expect, test } from 'bun:test'
import { createRootLogger } from '../../../../apps/admin-bot/src/core/logger'
import { collectStream } from '../../../util'

test('redacts participant inputs and flags from serialized logs', async () => {
  const { destination, read } = collectStream()
  const logger = createRootLogger(destination, 'info')
  const secrets = {
    childInput: 'child-input-secret',
    childFlag: 'flag{child-secret}',
    topLevelFlag: 'flag{top-level-secret}',
    topLevelInput: 'top-level-input-secret',
    nestedJobFlag: 'flag{nested-job-secret}',
    submittedFlag: 'flag{submitted-secret}',
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
        submittedFlag: secrets.submittedFlag,
        details: { submittedFlag: secrets.submittedFlag },
        flags: [{ provider: 'flags/static', flag: secrets.topLevelFlag }],
        input: secrets.topLevelInput,
        inputs: secrets.topLevelInput,
        job: {
          flag: secrets.nestedJobFlag,
          flags: [{ provider: 'flags/static', flag: secrets.nestedJobFlag }],
          inputs: { url: secrets.topLevelInput },
        },
      },
      'sensitive logging test'
    )

  const output = await read()

  expect(output).toContain('safe-log-marker')
  for (const secret of Object.values(secrets)) {
    expect(output).not.toContain(secret)
  }
})
