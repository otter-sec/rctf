import { BaseProvider } from '../base'

export interface CaptchaOptions {
  ip: string
  code: string
}

export abstract class CaptchaProvider extends BaseProvider {
  abstract getPublicOptions(): Record<string, string>
  abstract validate(options: CaptchaOptions): Promise<boolean>
}
