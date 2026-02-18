import type { Frame, Page } from 'puppeteer-core'
import type { OutputHandler } from '../../core/output'
import type { HooksConfig } from './index'
import { consoleMsgTypeToLevel } from './console'

export const hookPageEvents = (
  page: Page,
  id: string,
  output: OutputHandler,
  config: HooksConfig
): void => {
  // NOTE(es3n1n): mixing async stuff in here might create race conditions

  page.on('request', request => {
    if (!config.showNavigation || !request.isNavigationRequest()) {
      return
    }
    if (request.frame() !== page.mainFrame()) {
      return
    }
    output.info('navigation', `navigation started: ${request.url()}`, {
      id,
    })
  })

  page.on('framenavigated', (frame: Frame) => {
    if (!config.showNavigation || frame !== page.mainFrame()) {
      return
    }
    output.info('navigation', `navigation completed: ${frame.url()}`, {
      id,
    })
  })

  page.on('dialog', dialog => {
    output.info('dialog', `${dialog.type()}: ${dialog.message()}`, {
      id,
    })
  })

  page.on('pageerror', error => {
    if (!config.showBrowserErrors || !(error instanceof Error)) {
      return
    }
    output.error('navigation', `page error: ${error.message}`, {
      id,
    })
  })

  page.on('requestfailed', request => {
    if (!config.showBrowserErrors) {
      return
    }

    const errorUrl = request.url()
    const errorText = request.failure()!.errorText
    output.error('network', `request to ${errorUrl} failed: ${errorText}`, {
      id,
    })
  })

  page.on('console', msg => {
    const msgType = msg.type()
    const text = msg.text()

    output.log(
      consoleMsgTypeToLevel[msgType] ?? 'info',
      'console',
      `console.${msgType}: ${text}`,
      {
        id,
      }
    )
  })
}
