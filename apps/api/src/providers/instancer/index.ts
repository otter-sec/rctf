import type { InstancerProvider } from './base'
import RctfCompatProvider from './rctf-compat'

export const instancerProviders: Record<
  string,
  (options: any) => InstancerProvider
> = {
  'instancer/rctf-compat': (options: any) => new RctfCompatProvider(options),
}
