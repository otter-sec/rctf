export type Csp = Record<string, string[]>

export const registeredProviders: BaseProvider[] = []

export abstract class BaseProvider {
  constructor() {
    registeredProviders.push(this)
  }

  getCspRules(): Csp {
    return {}
  }
}
