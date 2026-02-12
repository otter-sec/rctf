import { sleep } from 'bun'
import { Challenge, type ChallengeContext } from '../src/types'

export const challenge = new Challenge({
  // required:
  timeoutMilliseconds: 30_000,

  inputs: {
    url: 'https://*',
  },

  handler: async (ctx: ChallengeContext): Promise<void> => {
    const page = await ctx.browserContext.newPage()
    await page.goto('http://127.0.0.1:8000/index.html')
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
    showNavigation: true,
    limitTabsNumber: 5,
  },
  restrictDomains: {
    // allow www.example.com and disallow other *.example.com
    'example.com': ['www.example.com'],
  },
})
