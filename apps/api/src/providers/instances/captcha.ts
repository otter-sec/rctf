import { config } from '@rctf/config'
import { captchaProviders } from '../captcha'
import { loadProvider } from './load'

export const captchaProvider = loadProvider(
  captchaProviders,
  config.captcha?.provider
)
