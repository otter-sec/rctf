import type { InstancerProvider } from './base'
import DockerInstancerProvider from './docker-instancer'
import K8sInstancerProvider from './k8s-instancer'
import ParadigmctfInstancerProvider from './paradigmctf-instancer'

export const instancerProviders: Record<
  string,
  (options: unknown) => InstancerProvider
> = {
  'instancers/docker': options => new DockerInstancerProvider(options),
  'instancers/k8s': options => new K8sInstancerProvider(options),
  'instancers/paradigmctf': options =>
    new ParadigmctfInstancerProvider(options),
}
