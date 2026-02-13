import { sleep } from 'bun'
import { Challenge, type ChallengeContext } from '../src/types'

export const challenge = new Challenge({
  // required:
  timeoutMilliseconds: 30_000,

  inputs: {
    url: '^http(s?)://.*',
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

  // optional:
  browser: 'chrome',
  browserArguments: undefined, // argv array
  browserVersion: 'stable',
  puppeteerLaunchOptionsExtra: undefined, // Record<string, unknown>

  hooksConfig: {
    showConsoleLogs: true,
    showBrowserErrors: true,
    showNavigation: true,
    limitTabsNumber: 5,
  },
  maxLogValueChars: 4096, // limit number of characters within strings in logs
  maxLogLines: 64, // limit the number of lines stored per submission

  restrictDomains: {
    // allow www.example.com and disallow other *.example.com
    'example.com': ['www.example.com'],
  },

  // 1. If challenge has no instancer configured, this value will be ignored.
  // 2. If instance lifetime is less than `timeoutMilliseconds` and this variable is set to true,
  //  the platform will reject job submission.
  // 3. If there's no active instancer instance and this variable is set to true,
  //  the platform will reject job submission.
  // 4. The values in `ChallengeContext.job.instancerInstances` will not be filled,
  //  unless this variable is set to true.
  // 5. This provides no guarantee that instances will still be alive by the time the handler executes,
  //  because the platform would not prevent someone from stopping the instance once the job is queued.
  // NOTES:
  // 1. Make sure to catch all unhandled errors if the instance was stopped right after the job was queued,
  //  or don't, the admin-bot will catch this exception and return an error to client, which is fine.
  // 2. The platform will NOT try to predict the time in queue, because it does not know how many consumers there are,
  //  and calculating worst-case minimal lifetime with only one expected consumer will lead to issues on high load.
  requireInstancerInstancesRunning: false,
})
