import type { Browser } from 'puppeteer'
import type { OutputHandler } from '../../core/output'
import { TargetTracker } from './targets'

// Heavily inspired (and copy pasted from) https://github.com/kevin-mizu/bot-ctf-template
// Thank you, mizu!

// NOTE: What's unsupported on firefox, but supported on chrome:
// - extension pages logging
// - console logs from service workers

export interface HooksConfig {
  showConsoleLogs?: boolean
  showBrowserErrors?: boolean
  showNavigation?: boolean
  limitTabsNumber?: number
}

export interface NormalizedHooksConfig {
  showConsoleLogs: boolean
  showBrowserErrors: boolean
  showNavigation: boolean
  limitTabsNumber: number
}

export const applyHooks = async (
  output: OutputHandler,
  browser: Browser,
  config?: HooksConfig
): Promise<void> => {
  const normalizedConfig: NormalizedHooksConfig = {
    showConsoleLogs: config?.showConsoleLogs ?? true,
    showBrowserErrors: config?.showBrowserErrors ?? true,
    showNavigation: config?.showNavigation ?? true,
    limitTabsNumber: config?.limitTabsNumber ?? -1,
  }

  const tracker = new TargetTracker(output, browser, normalizedConfig)
  browser.on('targetcreated', tracker.onTargetCreated)
  browser.on('targetdestroyed', tracker.onTargetDestroyed)
}
