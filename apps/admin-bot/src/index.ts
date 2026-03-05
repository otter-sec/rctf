import { Hono } from 'hono'
import { ChallengeLoader } from './core/loader'
import { BrowserManager, type BrowserVersion } from './browser/manager'
import { PlatformClient } from './core/platform'
import { startPoller } from './core/poller'
import { bearerAuth } from 'hono/bearer-auth'
import { validator } from 'hono/validator'
import { createLogger } from './core/logger'

export const app = new Hono()
export const browserManager = new BrowserManager(process.env.BROWSER_CACHE_DIR)
export const challenges = new ChallengeLoader()
const logger = createLogger('index')

const RCTF_BASE_URL = process.env.RCTF_BASE_URL
const RCTF_SECRET_KEY = process.env.RCTF_SECRET_KEY
if (!RCTF_BASE_URL || !RCTF_SECRET_KEY) {
  throw new Error('Please set RCTF_BASE_URL and RCTF_SECRET_KEY env variables')
}

const extraHeaders: Record<string, string> = process.env.RCTF_EXTRA_HEADERS
  ? JSON.parse(process.env.RCTF_EXTRA_HEADERS)
  : {}

export const platform = new PlatformClient(
  RCTF_BASE_URL,
  RCTF_SECRET_KEY,
  extraHeaders
)

app.use('/*', bearerAuth({ token: RCTF_SECRET_KEY }))

app.post(
  '/v1/test',
  validator('json', (value, c) => {
    // zod at home:
    if (typeof value !== 'object') {
      return c.json({ detail: 'invalid body' }, 400)
    }

    const source = value['source']
    if (typeof source !== 'string') {
      return c.json({ detail: 'invalid body' }, 400)
    }

    return value
  }),
  async c => {
    const json = c.req.valid('json')
    const result = await challenges.loadChallenge(json['source'])

    if (typeof result === 'string') {
      return c.json(
        {
          detail: result,
        },
        200
      )
    }

    return c.json(
      {
        inputs: result.config.inputs,
        timeoutMilliseconds: result.config.timeoutMilliseconds,
        requireInstancerInstancesRunning:
          result.config.requireInstancerInstancesRunning ?? false,
      },
      200
    )
  }
)

const main = async () => {
  const port = Number(process.env.PORT ?? 21337)
  logger.info(
    `Listening on :${port} with rctf @ ${RCTF_BASE_URL} and ${RCTF_SECRET_KEY.length}-length secret key`
  )
  Bun.serve({ port, fetch: app.fetch })

  startPoller(challenges, browserManager, platform)
}

export default main
if (import.meta.main) {
  main()
}
