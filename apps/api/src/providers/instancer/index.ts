import type { InstancerProvider } from './base'
import TinyInstancerProvider from './tiny-instancer'

export const instancerProviders: Record<
  string,
  (options: unknown) => InstancerProvider
> = {
  'instancer/tiny-instancer': options => new TinyInstancerProvider(options),
}
