export interface CaptchaOptions {
  ip: string
  code: string
}

export interface CaptchaProvider {
  getPublicOptions: () => Record<string, string>
  validate: (options: CaptchaOptions) => Promise<boolean>
}
