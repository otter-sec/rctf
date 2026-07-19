import { BaseProvider } from '../base'

export abstract class AnalyticsProvider extends BaseProvider {
  abstract getScriptUrl(): string
}
