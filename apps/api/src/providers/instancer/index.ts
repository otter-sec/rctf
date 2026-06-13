import type { InstancerProvider } from './base'
import DockerInstancerProvider from './docker-instancer'
import K8sInstancerProvider from './k8s-instancer'
import ParadigmctfInstancerProvider from './paradigmctf-instancer'

export const instancerProviders: Record<
  string,
  (options: unknown) => InstancerProvider
> = {
  'instancer/docker-instancer': options => new DockerInstancerProvider(options),
  'instancer/k8s-instancer': options => new K8sInstancerProvider(options),
  'instancer/paradigmctf-instancer': options =>
    new ParadigmctfInstancerProvider(options),
}
