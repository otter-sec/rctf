import { Challenge } from '../types'
import * as TypesModule from '../types'

import { createLogger } from './logger'

const logger = createLogger('loader')

const MODULES_MAPPING: Map<string[], any> = new Map([
  [
    [
      '../src/types',
      '../types',
      './types',
      './src/types',
      'src/types',
      'types',
    ],
    TypesModule,
  ],
])

const cacheKey = (id: string, revision: string): string => `${id}:${revision}`

export class ChallengeLoader {
  // key is "id:revision"
  private challenges = new Map<string, Challenge>()
  private currentRevisions = new Map<string, string>()

  async loadChallenge(source: string): Promise<Challenge | string> {
    try {
      const result = await Bun.build({
        entrypoints: ['<challenge>'],
        format: 'cjs',
        target: 'bun',
        external: MODULES_MAPPING.keys().toArray().flat(),
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
        for (const [k, v] of MODULES_MAPPING.entries()) {
          if (k.includes(name)) {
            return v
          }
        }
        throw new Error(
          `Module '${name}' is not allowed. Allowed modules: ${MODULES_MAPPING.keys().toArray().flat().join(', ')}`
        )
      }

      // this input is trusted, so rce is fine :thumbsup:
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
