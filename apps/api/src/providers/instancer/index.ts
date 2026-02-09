import type { InstancerProvider } from './base'
import TinyInstancerProvider from './tiny-instancer'
import K8sInstancerProvider from './k8s-instancer'

export const instancerProviders: Record<
  string,
  (options: unknown) => InstancerProvider
> = {
  'instancer/tiny-instancer': options => new TinyInstancerProvider(options),
  'instancer/k8s-instancer': options => new K8sInstancerProvider(options),
}
