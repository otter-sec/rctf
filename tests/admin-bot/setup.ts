import { mock } from 'bun:test'

process.env.RCTF_BASE_URL = 'http://localhost:9999'
process.env.RCTF_SECRET_KEY = 'test-secret-key'
process.env.LOG_LEVEL = 'silent'

mock.module('@puppeteer/browsers', () => ({
  Browser: {
    CHROME: 'chrome',
    FIREFOX: 'firefox',
  },
  detectBrowserPlatform: () => 'linux',
  resolveBuildId: async () => 'fake-build-id',
  computeExecutablePath: () => '/fake/browser/path',
  install: async () => ({
    executablePath: '/fake/browser/path',
  }),
}))

const createMockPage = () => ({
  on: () => {},
  off: () => {},
  close: async () => {},
  goto: async () => {},
  url: () => 'about:blank',
  evaluate: async (fn: Function) => fn(),
  waitForNavigation: async () => {},
  setViewport: async () => {},
})

const createMockBrowserContext = () => ({
  newPage: async () => createMockPage(),
  pages: async () => [createMockPage()],
  close: async () => {},
  on: () => {},
  off: () => {},
})

const createMockBrowser = () => ({
  createBrowserContext: async () => createMockBrowserContext(),
  on: () => {},
  off: () => {},
  close: async () => {},
  pages: async () => [],
  targets: () => [],
  newPage: async () => createMockPage(),
  defaultBrowserContext: () => createMockBrowserContext(),
})

mock.module('puppeteer-core', () => ({
  launch: async () => createMockBrowser(),
}))
