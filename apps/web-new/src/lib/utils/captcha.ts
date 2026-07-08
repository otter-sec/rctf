import type { ClientConfig, ProtectedAction } from '@rctf/types'
import { loadScriptOnce } from '$lib/utils/script-loader'

export class CaptchaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CaptchaError'
  }
}

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

interface CaptchaState {
  container: HTMLDivElement | null
  widgetId: string | number | null
  resolve: ((token: string) => void) | null
  reject: ((error: Error) => void) | null
}

interface CaptchaHandler {
  scriptUrl: string
  init: (state: CaptchaState, siteKey: string) => Promise<void>
  execute: (state: CaptchaState, siteKey: string) => Promise<string>
}

const captchaStates: Record<string, CaptchaState> = {}
const getState = (provider: string): CaptchaState => {
  const existing = captchaStates[provider]
  if (existing) return existing
  const state: CaptchaState = {
    container: null,
    widgetId: null,
    resolve: null,
    reject: null,
  }
  captchaStates[provider] = state
  return state
}

const createContainer = (): HTMLDivElement => {
  const container = document.createElement('div')
  container.style.display = 'none'
  document.body.appendChild(container)
  return container
}

const resolveState = (state: CaptchaState, token: string) => {
  if (state.resolve) {
    state.resolve(token)
    state.resolve = null
    state.reject = null
  }
}

const rejectState = (state: CaptchaState, message: string) => {
  if (state.reject) {
    state.reject(new CaptchaError(message))
    state.resolve = null
    state.reject = null
  }
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
        callback: (token: string) => resolveState(state, token),
        'expired-callback': () =>
          rejectState(state, 'reCAPTCHA response expired'),
        'error-callback': () =>
          rejectState(state, 'reCAPTCHA error (network issue)'),
      }) as number
    },
    async execute(state) {
      // @ts-expect-error grecaptcha global
      grecaptcha.reset(state.widgetId)

      return new Promise<string>((resolve, reject) => {
        state.resolve = resolve
        state.reject = reject
        // @ts-expect-error grecaptcha global
        grecaptcha.execute(state.widgetId)
      })
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
        callback: (token: string) => resolveState(state, token),
        'error-callback': (errorCode: string) => {
          rejectState(state, `Turnstile error: ${errorCode}`)
          return true
        },
        'timeout-callback': () =>
          rejectState(state, 'Turnstile challenge timed out'),
      }) as string
    },
    async execute(state) {
      // @ts-expect-error turnstile global
      turnstile.reset(state.widgetId)

      return new Promise<string>((resolve, reject) => {
        state.resolve = resolve
        state.reject = reject
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
    throw new CaptchaError(`Unknown captcha provider: ${info.provider}`)
  }

  try {
    await loadScriptOnce(handler.scriptUrl)
    const state = getState(info.provider)
    await handler.init(state, info.siteKey)
    return await handler.execute(state, info.siteKey)
  } catch (err) {
    if (err instanceof CaptchaError) {
      throw err
    }
    throw new CaptchaError(
      err instanceof Error ? err.message : 'Captcha verification failed'
    )
  }
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
