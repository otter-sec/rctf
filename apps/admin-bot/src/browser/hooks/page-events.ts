import type { Frame, Page } from 'puppeteer'
import type { OutputHandler } from '../../core/output'
import type { NormalizedHooksConfig } from './index'
import { consoleMsgTypeToLevel, createConsoleCallback } from './console'

export const hookPageEvents = async (
  page: Page,
  id: string,
  output: OutputHandler,
  config: NormalizedHooksConfig
): Promise<void> => {
  try {
    const client = await page.createCDPSession()
    await client.send('Runtime.enable')
    client.on(
      'Runtime.consoleAPICalled',
      createConsoleCallback(output, config, id)
    )
  } catch (err) {
    // fallback to simple console listener implementation for firefox:
    if (config.showConsoleLogs) {
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
  }

  page.on('framenavigated', (frame: Frame) => {
    if (!config.showNavigation || frame !== page.mainFrame()) {
      return
    }
    output.info('navigation', `navigating to ${frame.url()}`, {
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
}
