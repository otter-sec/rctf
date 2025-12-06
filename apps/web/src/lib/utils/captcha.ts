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

let recaptchaReadyPromise: Promise<void> | null = null
let recaptchaWidgetId: number | null = null
const ensureRecaptcha = async (siteKey: string) => {
  await loadScriptOnce(
    'https://www.google.com/recaptcha/api.js?render=explicit'
  )

  if (!recaptchaReadyPromise) {
    recaptchaReadyPromise = new Promise(resolve => {
      // @ts-expect-error recaptcha global
      grecaptcha.ready(() => resolve())
    })
  }

  await recaptchaReadyPromise

  if (recaptchaWidgetId === null) {
    const container = document.createElement('div')
    container.style.display = 'none'
    document.body.appendChild(container)

    // @ts-expect-error recaptcha global
    recaptchaWidgetId = grecaptcha.render(container, {
      sitekey: siteKey,
      size: 'invisible',
    }) as number
  }
}

let hcaptchaContainer: HTMLDivElement | null = null
let hcaptchaWidgetId: string | null = null
const ensureHcaptcha = async (siteKey: string) => {
  await loadScriptOnce('https://js.hcaptcha.com/1/api.js?render=explicit')

  if (!hcaptchaContainer) {
    hcaptchaContainer = document.createElement('div')
    hcaptchaContainer.style.display = 'none'
    document.body.appendChild(hcaptchaContainer)
  }

  if (hcaptchaWidgetId === null) {
    // @ts-expect-error hcaptcha global
    hcaptchaWidgetId = hcaptcha.render(hcaptchaContainer, {
      sitekey: siteKey,
      size: 'invisible',
    }) as string
  }
}

export const requestCaptchaCode = async (
  action: ProtectedAction,
  config: ClientConfig | undefined | null
): Promise<string | undefined> => {
  const info = getCaptchaInfo(config)
  if (!info || !isCaptchaProtected(action, config)) {
    return undefined
  }

  if (info.provider === 'captcha/recaptcha') {
    await ensureRecaptcha(info.siteKey)
    // @ts-expect-error recaptcha global
    grecaptcha.reset(recaptchaWidgetId!)
    // @ts-expect-error recaptcha global
    return grecaptcha.execute(recaptchaWidgetId!)
  }

  if (info.provider === 'captcha/hcaptcha') {
    await ensureHcaptcha(info.siteKey)
    // @ts-expect-error hcaptcha global
    hcaptcha.reset(hcaptchaWidgetId)
    // @ts-expect-error hcaptcha global
    return hcaptcha.execute(hcaptchaWidgetId, {
      async: true,
    }) as Promise<string>
  }

  throw new Error(`Unknown captcha provider: ${info.provider}`)
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
