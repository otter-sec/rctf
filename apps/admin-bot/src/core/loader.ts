import deepmerge from 'deepmerge'
import yaml from 'yaml'
import {
  Challenge,
  type ChallengeConfig,
  type ChallengeDefaultsFile,
} from '../types'
import * as TypesModule from '../types'
import { createLogger } from './logger'
import { defaultBrowser } from './const'

const logger = createLogger('loader')

const TYPES_MODULE_PATHS = [
  '../src/types',
  '../types',
  './types',
  './src/types',
  'src/types',
  'types',
]

const cacheKey = (id: string, revision: string): string => `${id}:${revision}`

export const loadChallengeDefaults = async (
  path?: string
): Promise<ChallengeDefaultsFile> => {
  if (!path) {
    return {}
  }

  return yaml.parse(await Bun.file(path).text()) ?? {}
}

const applyChallengeDefaults = (
  defaults: ChallengeDefaultsFile,
  config: ChallengeConfig
): ChallengeConfig => {
  const browser = config.browser ?? defaults.common?.browser ?? defaultBrowser
  return deepmerge.all<ChallengeConfig>(
    [defaults.common ?? {}, defaults[browser] ?? {}, config],
    {
      arrayMerge: (_defaults, configValues) => configValues,
    }
  )
}

export class ChallengeLoader {
  // key is "id:revision"
  private challenges = new Map<string, Challenge>()
  private currentRevisions = new Map<string, string>()
  private typesModule: typeof TypesModule

  constructor(defaults: ChallengeDefaultsFile = {}) {
    this.typesModule = {
      ...TypesModule,
      Challenge: class extends Challenge {
        constructor(config: ChallengeConfig) {
          super(applyChallengeDefaults(defaults, config))
        }
      },
    }
  }

  async loadChallenge(source: string): Promise<Challenge | string> {
    try {
      const result = await Bun.build({
        entrypoints: ['<challenge>'],
        format: 'cjs',
        target: 'bun',
        external: TYPES_MODULE_PATHS,
        plugins: [
          {
            name: 'challenge-loader',
            setup(build) {
              build.onResolve({ filter: /^<challenge>$/ }, () => ({
                path: '<challenge>',
                namespace: 'challenge',
              }))

              build.onLoad({ filter: /.*/, namespace: 'challenge' }, () => ({
                contents: source,
                loader: 'ts',
              }))
            },
          },
        ],
      })

      if (!result.success || result.outputs.length === 0) {
        return `build failed: ${result.logs.map(l => l.message).join(', ')}`
      }

      const transpiled = await result.outputs[0]!.text()

      const moduleExports: any = {}
      const module = { exports: moduleExports }
      const customRequire = (name: string) => {
        if (TYPES_MODULE_PATHS.includes(name)) {
          return this.typesModule
        }
        throw new Error(
          `Module '${name}' is not allowed. Allowed modules: ${TYPES_MODULE_PATHS.join(', ')}`
        )
      }

      // oxlint-disable-next-line no-eval -- the challenge code is trusted
      eval(transpiled)(
        moduleExports,
        customRequire,
        module,
        '<challenge>',
        '<challenge-dir>'
      )
      const challenge = module.exports.challenge || moduleExports.challenge
      if (!challenge) {
        return 'missing challenge export in source'
      }

      if (!(challenge instanceof Challenge)) {
        return 'challenge export must be an instance of Challenge class'
      }

      return challenge
    } catch (err) {
      return `unable to load challenge, ${err}`
    }
  }

  async loadFromSource(
    id: string,
    revision: string,
    source: string
  ): Promise<Challenge | undefined> {
    const log = logger.child({ id, revision })
    const challenge = await this.loadChallenge(source)

    if (typeof challenge === 'string') {
      log.error({ msg: challenge }, 'unable to load challenge from source')
      return undefined
    }

    const key = cacheKey(id, revision)
    if (this.challenges.has(key)) {
      log.warn('duplicate challenge')
      return undefined
    }

    const oldKey = this.currentRevisions.get(id)
    if (oldKey && oldKey !== key) {
      this.challenges.delete(oldKey)
      log.info({ evictedKey: oldKey }, 'evicted old challenge revision')
    }

    this.challenges.set(key, challenge)
    this.currentRevisions.set(id, key)
    log.info('loaded challenge from source')
    return challenge
  }

  unload(id: string, revision: string): boolean {
    const key = cacheKey(id, revision)
    const existed = this.challenges.has(key)
    this.challenges.delete(key)
    if (existed) {
      if (this.currentRevisions.get(id) === key) {
        this.currentRevisions.delete(id)
      }
      logger.info({ id, revision }, 'unloaded challenge')
    }
    return existed
  }

  get(id: string, revision: string): Challenge | undefined {
    return this.challenges.get(cacheKey(id, revision))
  }

  getAll(): [[string, string], Challenge][] {
    return Array.from(this.challenges.entries()).map(
      ([key, challenge]): [[string, string], Challenge] => {
        const sepIndex = key.lastIndexOf(':')
        const id = key.substring(0, sepIndex)
        const revision = key.substring(sepIndex + 1)
        return [[id, revision], challenge]
      }
    )
  }
}
