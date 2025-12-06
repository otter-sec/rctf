import { ProtectedAction } from '@rctf/types'
import type { ClientConfig } from '$lib/api'

const getCaptchaInfo = (config: ClientConfig | undefined | null) => {
  const captcha = config?.captcha
  if (!captcha) return null
  const siteKey = captcha.publicOptions?.siteKey
  if (!captcha.provider || !siteKey) return null
  return {
    provider: captcha.provider,
    siteKey,
    protected: captcha.protectedEndpoints ?? {},
  }
}

export const isCaptchaProtected = (
  action: ProtectedAction,
  config: ClientConfig | undefined | null
): boolean => {
  const info = getCaptchaInfo(config)
  return info?.protected?.[action] ?? false
}

const loadScriptOnce = (src: string): Promise<void> => {
  if (typeof document === 'undefined') return Promise.resolve()

  const existing = document.querySelector(
    `script[src="${src}"]`
  ) as HTMLScriptElement | null
  if (existing) {
    return existing.dataset.loaded === 'true'
      ? Promise.resolve()
      : new Promise(resolve => {
          existing.addEventListener('load', () => resolve(), { once: true })
        })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.dataset.loaded = 'false'
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

interface CaptchaState {
  container: HTMLDivElement | null
  widgetId: string | number | null
  resolve: ((token: string) => void) | null
}

interface CaptchaHandler {
  scriptUrl: string
  init: (state: CaptchaState, siteKey: string) => Promise<void>
  execute: (state: CaptchaState, siteKey: string) => Promise<string>
}

const captchaStates: Record<string, CaptchaState> = {}
const getState = (provider: string): CaptchaState => {
  if (!captchaStates[provider]) {
    captchaStates[provider] = { container: null, widgetId: null, resolve: null }
  }
  return captchaStates[provider]
}

const createContainer = (): HTMLDivElement => {
  const container = document.createElement('div')
  container.style.display = 'none'
  document.body.appendChild(container)
  return container
}

let recaptchaReadyPromise: Promise<void> | null = null
const captchaHandlers: Record<string, CaptchaHandler> = {
  'captcha/recaptcha': {
    scriptUrl: 'https://www.google.com/recaptcha/api.js?render=explicit',
    async init(state, siteKey) {
      if (!recaptchaReadyPromise) {
        recaptchaReadyPromise = new Promise(resolve => {
          // @ts-expect-error grecaptcha global
          grecaptcha.ready(() => resolve())
        })
      }

      await recaptchaReadyPromise

      if (state.widgetId !== null) {
        return
      }

      state.container = createContainer()
      // @ts-expect-error grecaptcha global
      state.widgetId = grecaptcha.render(state.container, {
        sitekey: siteKey,
        size: 'invisible',
      }) as number
    },
    async execute(state) {
      // @ts-expect-error grecaptcha global
      grecaptcha.reset(state.widgetId)
      // @ts-expect-error grecaptcha global
      return grecaptcha.execute(state.widgetId)
    },
  },

  'captcha/hcaptcha': {
    scriptUrl: 'https://js.hcaptcha.com/1/api.js?render=explicit',
    async init(state, siteKey) {
      if (state.widgetId !== null) {
        return
      }

      state.container = createContainer()
      // @ts-expect-error hcaptcha global
      state.widgetId = hcaptcha.render(state.container, {
        sitekey: siteKey,
        size: 'invisible',
      }) as string
    },
    async execute(state) {
      // @ts-expect-error hcaptcha global
      hcaptcha.reset(state.widgetId)

      // @ts-expect-error hcaptcha global
      const result = (await hcaptcha.execute(state.widgetId, {
        async: true,
      })) as { key: string; response: string }
      return result.response
    },
  },

  'captcha/turnstile': {
    scriptUrl:
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    async init(state, siteKey) {
      if (state.widgetId !== null) {
        return
      }

      state.container = createContainer()
      // @ts-expect-error turnstile global
      state.widgetId = turnstile.render(state.container, {
        sitekey: siteKey,
        size: 'invisible',
        execution: 'execute',
        callback: (token: string) => {
          if (state.resolve) {
            state.resolve(token)
            state.resolve = null
          }
        },
      }) as string
    },
    async execute(state) {
      // @ts-expect-error turnstile global
      turnstile.reset(state.widgetId)

      return new Promise<string>(resolve => {
        state.resolve = resolve
        // @ts-expect-error turnstile global
        turnstile.execute(state.container)
      })
    },
  },
}

export const requestCaptchaCode = async (
  action: ProtectedAction,
  config: ClientConfig | undefined | null
): Promise<string | undefined> => {
  const info = getCaptchaInfo(config)
  if (!info || !isCaptchaProtected(action, config)) {
    return undefined
  }

  const handler = captchaHandlers[info.provider]
  if (!handler) {
    throw new Error(`Unknown captcha provider: ${info.provider}`)
  }

  await loadScriptOnce(handler.scriptUrl)
  const state = getState(info.provider)
  await handler.init(state, info.siteKey)
  return handler.execute(state, info.siteKey)
}

export const getCaptchaCode = async (
  action: ProtectedAction,
  config: ClientConfig | undefined | null
): Promise<string | undefined> => {
  return isCaptchaProtected(action, config)
    ? await requestCaptchaCode(action, config)
    : undefined
}

export const getCaptchaProvider = (
  config: ClientConfig | undefined | null
): string | null => {
  const info = getCaptchaInfo(config)
  if (!info) return null
  return info.provider
}
