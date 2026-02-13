import { Browser, Frame, Page, Protocol, Target, WebWorker } from 'puppeteer'
import type { LogLevel, OutputHandler } from '../core/output'

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

const getTargetId = (target: Target): string => {
  return (target as any)._targetId
}

const consoleMsgTypeToLevel: Record<string, LogLevel> = {
  error: 'error',
  warning: 'warn',
  // if not defined fallbacks to info
}

export const applyHooks = async (
  output: OutputHandler,
  browser: Browser,
  config?: HooksConfig
): Promise<void> => {
  const normalizedConfig = {
    showConsoleLogs: config?.showConsoleLogs ?? true,
    showBrowserErrors: config?.showBrowserErrors ?? true,
    showNavigation: config?.showNavigation ?? true,
    limitTabsNumber: config?.limitTabsNumber ?? -1,
  }

  let extensions: number = 0
  let workers: number = 0
  let tabs: string[] = []
  const getTabInternalId = (target: Target): string => {
    return `T${tabs.indexOf(getTargetId(target)) + 1}`
  }

  // ref: https://stackoverflow.com/a/74223105
  const consoleCalledApiCallback =
    (id: string) => (event: Protocol.Runtime.ConsoleAPICalledEvent) => {
      if (!normalizedConfig.showConsoleLogs) {
        return
      }

      const msgType = event.type
      const message = event.args
        .map((arg: Protocol.Runtime.RemoteObject): string => {
          if (arg.type === 'undefined') {
            return 'undefined'
          }

          if (arg.value !== undefined) {
            if (arg.type === 'object') {
              try {
                return JSON.stringify(arg.value)
              } catch {}
            }
            return String(arg.value)
          }

          if (arg.unserializableValue !== undefined) {
            return String(arg.unserializableValue)
          }

          if (arg.preview) {
            const props = arg.preview.properties
              ?.map(
                p =>
                  `${p.name}: ${p.value ?? p.valuePreview?.description ?? '?'}`
              )
              .join(', ')
            return `{${props || ''}}`
          }

          if (arg.description !== undefined) {
            return arg.description
          }

          if (arg.deepSerializedValue?.value !== undefined) {
            return String(arg.deepSerializedValue.value)
          }

          return '[unknown]'
        })
        .join(' ')

      output.log(
        consoleMsgTypeToLevel[msgType] ?? 'info',
        'console',
        `console.${msgType}: ${message}`,
        {
          id,
        }
      )
    }

  const hookPageEvents = async function (page: Page, id: string) {
    try {
      const client = await page.createCDPSession()
      await client.send('Runtime.enable')
      client.on('Runtime.consoleAPICalled', consoleCalledApiCallback(id))
    } catch (err) {
      // fallback to simple console listener implementation for firefox:
      if (normalizedConfig.showConsoleLogs) {
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
      if (!normalizedConfig.showNavigation || frame !== page.mainFrame()) {
        return
      }
      output.info('navigation', `navigating to ${frame.url()}`, {
        id,
      })
    })

    page.on('pageerror', error => {
      if (!normalizedConfig.showBrowserErrors || !(error instanceof Error)) {
        return
      }
      output.error('navigation', `page error: ${error.message}`, {
        id,
      })
    })

    page.on('requestfailed', request => {
      if (!normalizedConfig.showBrowserErrors) {
        return
      }

      const errorUrl = request.url()
      const errorText = request.failure()!.errorText
      output.error('network', `request to ${errorUrl} failed: ${errorText}`, {
        id,
      })
    })
  }

  const targetCreatedHook = async (target: Target): Promise<void> => {
    switch (target.type()) {
      case 'page':
        tabs.push(getTargetId(target))

        // If limitTabsNumber is set to 0, prevent opening any tabs
        if (
          normalizedConfig.limitTabsNumber >= 0 &&
          tabs.length > normalizedConfig.limitTabsNumber
        ) {
          await browser.close()
          throw new Error(
            `Opened more than ${normalizedConfig.limitTabsNumber} tabs`
          )
        }

        const t = getTabInternalId(target)
        output.info('navigation', `tab created`, {
          id: t,
        })

        const page = await target.page()
        if (page) {
          await hookPageEvents(page, t)

          // Log the current URL after hooks are set up — by now the page
          // may have already navigated past about:blank
          const currentUrl = page.url()
          if (currentUrl && currentUrl !== 'about:blank') {
            output.info('navigation', `navigating to ${currentUrl}`, {
              id: t,
            })
          }
        }
        break
      case 'background_page':
        break
      case 'service_worker':
        const serviceId = `S${workers++}`
        if (normalizedConfig.showNavigation) {
          output.info('navigation', 'service worker created', {
            id: serviceId,
          })
        }

        try {
          const worker = await target.worker()
          if (!worker) {
            output.warn(
              'navigation',
              'service worker created, but can not be accessed!',
              {
                id: serviceId,
              }
            )
            return
          }

          worker.client.on(
            'Runtime.consoleAPICalled',
            consoleCalledApiCallback(serviceId)
          )
        } catch (err) {
          output.error('navigation', 'failed to attach to service worker', {
            id: serviceId,
          })
        }
        break
      case 'browser':
        break
      case 'webview':
        break
      case 'other':
        const client = await target.createCDPSession()
        await client.send('Runtime.enable')
        const info = await client.send('Target.getTargetInfo', {
          targetId: getTargetId(target),
        })

        // We are handling only extensions for now
        if (!info?.targetInfo?.url?.startsWith('chrome-extension://')) {
          return
        }

        const id = `E${extensions++}`
        output.info(
          'navigation',
          `extension page created, navigating to ${info.targetInfo.url}`,
          {
            id,
          }
        )
        client.on('Runtime.consoleAPICalled', consoleCalledApiCallback(id))
        break
    }
  }

  const targetDestroyedHook = (target: Target): void => {
    switch (target.type()) {
      case 'page':
        if (normalizedConfig.showNavigation) {
          output.info('navigation', `tab closed`, {
            id: getTabInternalId(target),
          })
        }
        break
    }
  }

  browser.on('targetcreated', targetCreatedHook)
  browser.on('targetdestroyed', targetDestroyedHook)
}
