#!/usr/bin/env bun

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  cancel,
  intro,
  isCancel,
  log,
  outro,
  select,
  spinner,
} from '@clack/prompts'
import { defineCommand, runMain } from 'citty'
import envPaths from 'env-paths'
import pc from 'picocolors'
import type { LocalRunnerRequest } from '../../../apps/admin-bot/src/local-protocol'
import {
  ensureDockerImage,
  ensureLocalDockerEndpoint,
  inspectInDocker,
  probeDockerDisplay,
  probeHostNetworking,
  runInDocker,
} from './docker'
import { mergeInputHistory } from './history'
import { historyText } from './history-prompt'
import {
  discoverLocalTargets,
  localTargetToInstance,
  localizePublicUrlRule,
  normalizeLocalTarget,
  type LocalTarget,
} from './local-target'
import { loadInputHistory, saveInputHistory } from './state'
import {
  collectPositionalInputs,
  localFlag,
  normalizeCliAliases,
  parseTimeout,
  renderLogs,
  shouldNormalizeInputRules,
  validateInput,
} from './lib'

process.env.LOG_LEVEL = 'silent'

const fail = (message: string): never => {
  cancel(message)
  process.exit(1)
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const failError = (error: unknown): never => fail(errorMessage(error))

const attempt = <T>(callback: () => T): T => {
  try {
    return callback()
  } catch (error) {
    return failError(error)
  }
}

const main = defineCommand({
  meta: {
    name: 'rctf-admin-bot',
    description: 'Try an rCTF admin bot submission locally',
  },
  args: {
    config: {
      type: 'positional',
      required: true,
      description: 'Downloaded admin bot config file',
    },
    'inputs...': {
      type: 'positional',
      required: false,
      description: 'Participant inputs in config order',
    },
    headful: {
      type: 'boolean',
      alias: 'g',
      default: false,
      description: 'Make the browser window GUI visible (alias: --gui)',
    },
    local: {
      type: 'boolean',
      alias: 'L',
      default: false,
      description: 'Run browser locally instead of through Docker',
    },
    live: {
      type: 'boolean',
      alias: 'l',
      default: false,
      description: 'Print browser logs as they arrive',
    },
    show: {
      type: 'boolean',
      alias: 's',
      default: false,
      description: 'Force enable all browser log hooks',
    },
    'restrict-domains': {
      type: 'boolean',
      alias: 'r',
      default: false,
      description: 'Enforce configured domain restrictions on local targets',
    },
    timeout: {
      type: 'string',
      alias: 't',
      description:
        'Override the config run timeout in milliseconds (0 for unlimited)',
    },
    target: {
      type: 'string',
      alias: 'T',
      description: 'Set the local target if Docker Compose cannot discover it',
    },
    verbose: {
      type: 'boolean',
      alias: 'v',
      default: false,
      description: 'Show extra log details and non-fatal errors',
    },
    'no-normalize': {
      type: 'boolean',
      alias: 'n',
      default: false,
      description: 'Disable input RegEx conversion to localhost',
    },
  },
  run: async ({ args }) => {
    const headful = args.headful
    const configPath = resolve(args.config)
    const paths = envPaths('rctf-admin-bot')
    let dockerImage: string | undefined
    if (!args.local) {
      await ensureLocalDockerEndpoint().catch(failError)
      dockerImage = await ensureDockerImage().catch(failError)

      const networkProbe = await probeHostNetworking(dockerImage, paths.data)
      if (!networkProbe.succeeded) {
        const probeDetails = networkProbe.stderr
          ? `\n\nDocker host-network probe stderr:\n${networkProbe.stderr}`
          : networkProbe.error
            ? `\n\nDocker host-network probe error:\n${networkProbe.error}`
            : ''
        fail(
          `Docker host networking could not reach 127.0.0.1.${probeDetails}\n\nEnable Docker host networking and retry:\nhttps://docs.docker.com/engine/network/drivers/host/\n\nOr relaunch with --local.`
        )
      }
    }
    if (dockerImage && headful) {
      await probeDockerDisplay(dockerImage).catch(failError)
    }

    intro(pc.bgCyan(pc.black(' rCTF admin bot ')))

    const timeoutOverride = attempt(() => parseTimeout(args.timeout))

    const source = await readFile(configPath, 'utf8').catch(error =>
      fail(`Could not read ${configPath}: ${errorMessage(error)}`)
    )

    const localRunner = dockerImage
      ? undefined
      : await import('../../../apps/admin-bot/src/local-runner')
    const inspection = await (
      dockerImage
        ? inspectInDocker(dockerImage, source)
        : localRunner!.inspectLocalChallenge(source)
    ) // This will eval, so prefer isolated docker
      .catch(failError)

    const inputHistory = await loadInputHistory(paths.data)
    const normalizeInputRules = shouldNormalizeInputRules(args)
    const inputEntries = Object.entries(inspection.inputs).map(
      ([name, rule]) => ({
        name,
        rule: normalizeInputRules ? localizePublicUrlRule(rule) : rule,
      })
    )
    const positionalInputs = args._.slice(1)
    const needsInstancerTarget = inspection.requireInstancerInstancesRunning
    const needsRestrictionTarget =
      inspection.hasDomainRestrictions && !args['restrict-domains']
    const needsLocalTarget = needsInstancerTarget || needsRestrictionTarget
    if (args.target && !needsLocalTarget) {
      fail(
        '--target requires blocking domain restrictions or requireInstancerInstancesRunning in the config'
      )
    }

    let localTarget: LocalTarget | undefined
    if (needsLocalTarget) {
      if (args.target) {
        localTarget = attempt(() => normalizeLocalTarget(args.target!))
      } else {
        const discovered = await discoverLocalTargets(configPath, {
          reportComposeError: args.verbose
            ? message => log.warn(message)
            : undefined,
        })
        if (discovered.length === 1) {
          localTarget = discovered[0]
        } else if (discovered.length > 1) {
          const selected = await select({
            message: 'Local target',
            options: discovered.map((target, index) => ({
              value: index,
              label: `${target.service ?? 'service'} - ${target.url}`,
              hint: target.containerPort
                ? `container port ${target.containerPort}`
                : undefined,
            })),
          })
          if (isCancel(selected)) {
            cancel('Submission cancelled.')
            process.exit(0)
          }
          localTarget = discovered[selected]
        } else {
          if (!(process.stdin.isTTY && process.stdout.isTTY)) {
            fail(
              'No local target was discovered and none was given. Pass --target.'
            )
          }
          const value = await historyText({
            message: 'Local target (failed to find in a Compose file)',
            placeholder: 'http://localhost:...',
            history: inputHistory.localTarget,
            validate: value => {
              try {
                normalizeLocalTarget(value)
                return undefined
              } catch (error) {
                return errorMessage(error)
              }
            },
          })
          if (isCancel(value)) {
            cancel('Submission cancelled.')
            process.exit(0)
          }
          localTarget = normalizeLocalTarget(value)
        }
      }
    }

    if (localTarget) {
      log.info(`Local target: ${localTarget.url}`)
    }

    const bypassDomainRestrictionOrigins =
      needsRestrictionTarget && localTarget
        ? [new URL(localTarget.url).origin]
        : []
    if (bypassDomainRestrictionOrigins.length > 0) {
      log.warn(
        `Domain restrictions are bypassed for the local target ${bypassDomainRestrictionOrigins[0]}. Other destinations remain restricted. Use --restrict-domains to enforce the config unchanged.`
      )
    }

    const inputs = attempt(() =>
      collectPositionalInputs(
        inputEntries.map(({ name, rule }) => [name, rule]),
        positionalInputs
      )
    )

    const missingInputNames = inputEntries
      .slice(positionalInputs.length)
      .map(({ name }) => name)
    if (
      missingInputNames.length > 0 &&
      !(process.stdin.isTTY && process.stdout.isTTY)
    ) {
      fail(
        `Missing required input arguments: ${missingInputNames.join(', ')}. Pass all config inputs as positional arguments when running noninteractively.`
      )
    }

    for (const [index, { name, rule }] of inputEntries.entries()) {
      if (index < positionalInputs.length) {
        continue
      }

      const value = await historyText({
        message: name,
        placeholder: rule.pattern,
        validate: value => validateInput(value, rule),
        history: inputHistory.inputs[name] ?? [],
      })
      if (isCancel(value)) {
        cancel('Submission cancelled.')
        process.exit(0)
      }
      inputs[name] = value
    }

    if (localTarget || Object.keys(inputs).length > 0) {
      const nextInputHistory = {
        localTarget: localTarget
          ? mergeInputHistory(inputHistory.localTarget, [localTarget.url])
          : inputHistory.localTarget,
        inputs: { ...inputHistory.inputs },
      }
      for (const [name, value] of Object.entries(inputs)) {
        nextInputHistory.inputs[name] = mergeInputHistory(
          inputHistory.inputs[name] ?? [],
          [value]
        )
      }
      await saveInputHistory(paths.data, nextInputHistory).catch(
        () => undefined
      )
    }

    const runSpinner = spinner()
    const browserMode = headful ? 'headful' : 'headless'
    const timeoutDescription =
      timeoutOverride === 0
        ? 'no timeout'
        : `${timeoutOverride ?? inspection.timeoutMilliseconds}ms timeout`
    const runMessage = `Running ${inspection.browser} (${browserMode}, ${timeoutDescription})`
    runSpinner.start(runMessage)
    if (args.live) {
      runSpinner.stop(runMessage)
    }

    const flag = localFlag()
    const request: Extract<LocalRunnerRequest, { action: 'run' }> = {
      action: 'run',
      source,
      inputs,
      job: {
        challengeId: 'local-challenge',
        configRevision: 'local',
        userId: 'local-user',
        submittedAt: new Date().toISOString(),
        flags: [{ provider: 'flags/local', flag }],
        flag,
        instancerInstances:
          needsInstancerTarget && localTarget
            ? [localTargetToInstance(localTarget)]
            : [],
      },
      options: {
        headless: !headful,
        showAllHooks: args.show,
        timeoutMilliseconds:
          timeoutOverride === 0 ? undefined : timeoutOverride,
        disableTimeout: timeoutOverride === 0,
        bypassDomainRestrictionOrigins,
        live: args.live,
      },
    }
    const onLine = (line: string) => {
      const rendered = renderLogs(line, args.verbose)
      if (rendered) {
        process.stdout.write(`${rendered}\n`)
      }
    }

    const result = await (
      dockerImage
        ? runInDocker(dockerImage, request, onLine)
        : localRunner!.runLocalChallenge(request, onLine, paths.cache)
    ).catch(error => {
      if (!args.live) {
        runSpinner.stop(pc.red('Job failed'))
      }
      return failError(error)
    })

    if (args.live) {
      if (result.succeeded) {
        log.success(pc.green('Job completed'))
      } else {
        log.error(pc.red('Job failed'))
      }
    } else {
      runSpinner.stop(
        result.succeeded ? pc.green('Job completed') : pc.red('Job failed')
      )
      const logs = renderLogs(result.logs, args.verbose)
      if (logs) {
        process.stdout.write(`\n${logs}\n\n`)
      }
    }

    if (!result.succeeded) {
      outro(pc.red('The submission failed.'))
      process.exitCode = 1
      return
    }
    outro(pc.green('The submission completed successfully.'))
  },
})

runMain(main, { rawArgs: normalizeCliAliases(process.argv.slice(2)) })
