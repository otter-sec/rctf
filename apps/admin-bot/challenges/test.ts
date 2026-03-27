import { sleep } from 'bun'
import { Challenge, type ChallengeContext } from '../src/types'

export const challenge = new Challenge({
  // required:
  timeoutMilliseconds: 30_000,

  inputs: {
    url: { pattern: '^http(s?)://.*' },
  },

  handler: async (ctx: ChallengeContext): Promise<void> => {
    const url = ctx.input.url!
    const page = await ctx.browserContext.newPage()

    ctx.output.info('challenge', 'hello from my challenge!', {
      optional: 'values',
      that: 'will be',
      displayed: 'separately!',
    })
    ctx.output.warn('challenge', 'warn!')
    ctx.output.error('challenge', 'error!')
    ctx.output.fatal('challenge', 'fatal!')

    try {
      await page.goto(url)
    } catch (e) {
      // Without this, the error propagated is that something went wrong.
      // Ideally, there would be automagic so you don't need to do this, but page navigations throw a normal error,
      //   and searching in a string is... ugly.
      // @see https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/cdp/Frame.ts#L210-L212
      ctx.output.fatal('challenge', `failed to visit provided URL: ${e}`, {
        url,
      })
      return
    }
    await sleep(15_000)
    await page.close()
  },

  hooksConfig: {
    showConsoleLogs: true,
    showBrowserErrors: true,
    showNavigation: true,
    limitTabsNumber: -1, // no limit
  },

  // optional:
  browser: 'chrome',
  // vvv argv array. by default we apply some default argv values,
  //   but if you override this we'll not add anything to the list!
  browserArguments: undefined,
  browserVersion: 'stable',
  puppeteerLaunchOptionsExtra: undefined, // Record<string, unknown>
  // vvv Record<string, unknown>. by default we apply some default values,
  //  but if you override this we'll not add anything to this mapping!
  extraPrefsFirefox: undefined,

  maxLogValueChars: 4096, // limit number of characters within strings in logs
  maxLogLines: 64, // limit the number of lines stored per submission

  restrictDomains: {
    // note on case sensitivity:
    // - `host` is always lowercased by the browser
    // - `url` param preserves the original casing of the path/query
    //
    // note on dns rebinding bypasses:
    // pac rules match on host/url strings only - they do not resolve DNS.
    // a blocklist-only config (disallowRegex without a catch-all) can be
    // bypassed by aliases that resolve to internal IPs (e.g. 127.0.0.1.nip.io).
    // to prevent this, pair allowRegex with a catch-all disallowRegex
    // so that only explicitly allowed hosts can be reached.

    // allow example.com, but not any other example.com subdomain
    host: {
      allowRegex: [{ pattern: '^example.com$' }],
      disallowRegex: [{ pattern: '^.*\\.example\\.com$' }],
    },
    // allow example.com/kek, but not any other urls on example.com
    url: {
      allowRegex: [{ pattern: 'example.com\\/kek' }],
      disallowRegex: [{ pattern: 'example.com' }],
    },
  },

  // 1. If challenge has no instancer configured, this value will be ignored.
  // 2. The values in `ChallengeContext.job.instancerInstances` will not be filled,
  //  unless this variable is set to true.
  // 3. This provides no guarantee that instances will still be alive by the time the handler executes,
  //  because the platform would not prevent someone from stopping the instance once the job is queued.
  requireInstancerInstancesRunning: false,
})
