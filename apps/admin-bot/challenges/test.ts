import { sleep } from 'bun'
import { Challenge, type ChallengeContext, log } from '../src/types'

export const challenge = new Challenge({
  // required:
  timeoutMilliseconds: 30_000,

  inputs: {
    url: '^http(s?)://.*',
  },

  handler: async (ctx: ChallengeContext): Promise<void> => {
    const page = await ctx.browserContext.newPage()

    try {
      await page.goto(ctx.input.url!)
    } catch(e) {
      // Without this, the error propagated is that something went wrong. Ideally, there would be automagic so you don't need to do this,
      // but page navigations throw a normal error and searching in a string is... ugly.
      // @see https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/cdp/Frame.ts#L210-L212
      log(ctx.output, 'admin-bot', `failed to visit provided URL: ${e}`)
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
  restrictDomains: {
    // allow www.example.com and disallow other *.example.com
    'example.com': ['www.example.com'],
  },
})
