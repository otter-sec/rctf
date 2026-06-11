import type { Browser } from 'puppeteer-core'
import type { OutputHandler } from '../../core/output'
import { TargetTracker } from './targets'

// Heavily inspired (and copy pasted from) https://github.com/kevin-mizu/bot-ctf-template
// Thank you, mizu!

// NOTE: What's unsupported on firefox, but supported on chrome:
// - extension pages logging
// - console logs from service workers

export interface HooksConfig {
  showConsoleLogs: boolean
  showBrowserErrors: boolean
  showNavigation: boolean
  showDialogs: boolean
  autoDismissDialogs: boolean
  limitTabsNumber: number
  limitTabsNumberShowError: boolean
}

export const resolveHooksConfig = (
  config?: Partial<HooksConfig>
): HooksConfig => ({
  showConsoleLogs: config?.showConsoleLogs ?? false,
  showBrowserErrors: config?.showBrowserErrors ?? false,
  showNavigation: config?.showNavigation ?? false,
  showDialogs: config?.showDialogs ?? false,
  autoDismissDialogs: config?.autoDismissDialogs ?? false,
  limitTabsNumber: config?.limitTabsNumber ?? -1,
  limitTabsNumberShowError: config?.limitTabsNumberShowError ?? false,
})

export const applyHooks = async (
  output: OutputHandler,
  browser: Browser,
  config: HooksConfig
): Promise<void> => {
  const tracker = new TargetTracker(output, browser, config)
  browser.on('targetcreated', tracker.onTargetCreated)
  browser.on('targetdestroyed', tracker.onTargetDestroyed)
}
