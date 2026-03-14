import type { Browser, Target } from 'puppeteer-core'
import type { OutputHandler } from '../../core/output'
import { createConsoleCallback } from './console'
import type { HooksConfig } from './index'
import { hookPageEvents } from './page-events'

const getTargetId = (target: Target): string => {
  return (target as any)._targetId
}

export class TargetTracker {
  private tabs: string[] = []
  private workers: number = 0
  private extensions: number = 0

  constructor(
    private readonly output: OutputHandler,
    private readonly browser: Browser,
    private readonly config: HooksConfig
  ) {}

  private getTabInternalId(target: Target): string {
    return `T${this.tabs.indexOf(getTargetId(target)) + 1}`
  }

  onTargetCreated = async (target: Target): Promise<void> => {
    switch (target.type()) {
      case 'page':
        this.tabs.push(getTargetId(target))

        // If limitTabsNumber is set to 0, prevent opening any tabs
        if (
          this.config.limitTabsNumber >= 0 &&
          this.tabs.length > this.config.limitTabsNumber
        ) {
          this.output.error(
            'navigation',
            `tab limit exceeded (${this.tabs.length} > ${this.config.limitTabsNumber}), closing browser`
          )
          await this.browser.close()
          return
        }

        const t = this.getTabInternalId(target)
        const openUrl = target.url()
        this.output.info('navigation', `tab created, url: ${openUrl}`, {
          id: t,
        })

        // TODO(es3n1n): there's technically a race condition here, but i have no idea how to fix it.
        //  maybe we should just switch entirely to CDP, and use this impl as a fallback for firefox.
        const page = await target.page()
        if (page) {
          hookPageEvents(page, t, this.output, this.config)
        }
        break
      case 'background_page':
        break
      case 'service_worker':
        const serviceId = `S${this.workers++}`
        if (this.config.showNavigation) {
          this.output.info('navigation', 'service worker created', {
            id: serviceId,
          })
        }

        try {
          const worker = await target.worker()
          if (!worker) {
            this.output.warn(
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
            createConsoleCallback(this.output, this.config, serviceId)
          )
        } catch (err) {
          this.output.error(
            'navigation',
            'failed to attach to service worker',
            {
              id: serviceId,
            }
          )
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

        const id = `E${this.extensions++}`
        this.output.info(
          'navigation',
          `extension page created, navigating to ${info.targetInfo.url}`,
          {
            id,
          }
        )
        client.on(
          'Runtime.consoleAPICalled',
          createConsoleCallback(this.output, this.config, id)
        )
        break
    }
  }

  onTargetDestroyed = (target: Target): void => {
    switch (target.type()) {
      case 'page':
        const targetId = getTargetId(target)
        const tabIndex = this.tabs.indexOf(targetId)
        if (tabIndex !== -1) {
          this.tabs.splice(tabIndex, 1)
        }

        if (this.config.showNavigation) {
          this.output.info('navigation', `tab closed`, {
            id: tabIndex === -1 ? 'T?' : `T${tabIndex + 1}`,
          })
        }
        break
    }
  }
}
