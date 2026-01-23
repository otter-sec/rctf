import * as z from 'zod/mini'
import {
  type CreateInstanceOptions,
  type ExtendInstanceOptions,
  type instanceDetailsOrError,
  type InstanceQueryOptions,
  type InstancerProvider,
  type ProviderConfig, InstanceStatus,
} from './base'
import { KubeConfig, CustomObjectsApi, ResponseContext, wrapHttpLibrary } from '@kubernetes/client-node'

const group = 'rctf-instancer.osec.io'
const version = 'v1'
const plural = 'challengeinstances'

interface K8sInstancerProviderOptions {
  authToken: string
  apiUrl: string
  caCertificate: string
}

const defaultPod = {
  name: 'whoami',
  egress: true,
  ports: [
    {
      port: 80,
    },
  ],
  spec: {
    automountServiceAccountToken: false,
    containers: [
      {
        name: 'whoami',
        image: 'traefik/whoami:latest',
        resources: {
          requests: {
            memory: '100Mi',
            cpu: '75m',
          },
          limits: {
            memory: '250Mi',
            cpu: '100m',
          },
        },
      },
    ],
  }
}



const k8sInstancerConfigSchema = z
  .object({
    pods: z.optional(
      z.prefault(
        z.array(
          // defining everything that kubernetes supports is... quite a lot of effort
          z.any(), // TODO: define me
        ),
        [defaultPod],
      ),
    )
    .check(z.describe('Pods')),
  })

export default class K8sInstancerProvider implements InstancerProvider {
  private readonly client: CustomObjectsApi

  readonly configSchema = k8sInstancerConfigSchema

  constructor(_options: unknown) {
    const options = {
      authToken: process.env.K8S_INSTANCER_AUTH_TOKEN ??
        (_options as K8sInstancerProviderOptions).authToken,
      apiUrl: process.env.K8S_INSTANCER_API_URL ??
        (_options as K8sInstancerProviderOptions).apiUrl,
      caCertificate: process.env.K8S_INSTANCER_CA_CERTIFICATE ??
        (_options as K8sInstancerProviderOptions).caCertificate,
    }

    if (!options.authToken || !options.apiUrl || !options.caCertificate) {
      throw new Error(
        'Missing authToken, apiUrl, and/or caCertificate for the K8sInstancerProvider.'
      )
    }

    const config = new KubeConfig()
    config.loadFromOptions({
      clusters: [
        {
          name: 'rctf-instancer',
          server: options.apiUrl,
          caData: options.caCertificate,
        }
      ],
      users: [
        {
          name: 'rctf-instancer',
          token: options.authToken,
        },
      ],
      contexts: [
        {
          name: 'rctf-instancer',
          cluster: 'rctf-instancer',
          user: 'rctf-instancer',
        },
      ],
      currentContext: 'rctf-instancer',
    })

    this.client = config.makeApiClient(CustomObjectsApi)

    // Bun and @kubernetes/client-node do not work very well together, and Bun causes
    // all mTLS options to be ignored. Therefore, we'll have to patch stuff around so
    // that it actually passes mTLS information in Bun's expected format.
    // @see https://github.com/oven-sh/bun/issues/7332#issuecomment-3706232322
    const api = (this.client as any).api
    api.configuration.httpApi = wrapHttpLibrary({
      async send(request) {
        const k8sAgent = (request as any).agent
        const url = request.getUrl()
        const response = await fetch(url, {
          method: request.getHttpMethod(),
          headers: request.getHeaders(),
          body: request.getBody(),
          signal: (request as any).signal,
          tls: {
            ca: k8sAgent.options.ca,
            cert: k8sAgent.options.cert,
            key: k8sAgent.options.key,
            rejectUnauthorized: false,
          },
        } as any)

        return new ResponseContext(
          response.status,
          Object.fromEntries((response.headers as any).entries()),
          {
            text: () => response.text(),
            binary: async () => Buffer.from(await response.arrayBuffer()),
          },
        )
      },
    })
  }

  private getResourceName(teamId: string, challengeIntegrationId: string): string {
    return `${challengeIntegrationId}-${teamId}`
  }

  getDefaults = (): ProviderConfig => this.configSchema.parse({})

  createInstance = async (
    options: CreateInstanceOptions
  ): Promise<instanceDetailsOrError> => {
    try {
      await this.client.createClusterCustomObject({
        group,
        version,
        plural,
        body: {
          apiVersion: `${group}/${version}`,
          kind: 'ChallengeInstance',
          metadata: {
            name: this.getResourceName(options.teamId, options.challengeIntegrationId),
          },
          spec: {
            ...options.config,
            expose: options.expose,
            teamId: options.teamId,
            challengeId: options.challengeIntegrationId,
            expiresAt: new Date(Date.now() + options.timeoutMilliseconds).toISOString(),
          },
        },
      })
    } catch (err: any) {
      if (err.code !== 409) {
        console.error('Failed to create instance', err)
        return {
          kind: 'instancerError',
          message: 'Something went wrong while trying to create instance',
        }
      }
    }

    return this.getInstance(options)
  }

  deleteInstance = async (
    options: InstanceQueryOptions
  ): Promise<instanceDetailsOrError> => {
    try {
      await this.client.deleteClusterCustomObject({
        group,
        version,
        plural,
        name: this.getResourceName(options.teamId, options.challengeIntegrationId),
      })
    } catch (err: any) {
      if (err.code !== 404) {
        console.error('Failed to delete instance', err)
        return {
          kind: 'instancerError',
          message: 'Something went wrong while trying to delete instance',
        }
      }
    }

    return this.getInstance(options)
  }

  getInstance = async (
    options: InstanceQueryOptions
  ): Promise<instanceDetailsOrError> => {
    try {
      const resource = await this.client.getClusterCustomObject({
        group,
        version,
        plural,
        name: this.getResourceName(options.teamId, options.challengeIntegrationId),
      })

      // TODO: in some rare circumstances `resource` can be undefined...? (which should throw 404 instead)

      if (resource.metadata.deletionTimestamp) {
        return {
          kind: 'instancerInstanceDetails',
          timeLeftMilliseconds: 0,
          endpoints: [],
          status: InstanceStatus.STOPPING,
        }
      }

      const readyStatus = resource.status.conditions.find((condition: any) => condition.type === 'Ready')
      if (readyStatus?.status === 'Unknown') {
        return {
          kind: 'instancerInstanceDetails',
          timeLeftMilliseconds: 0,
          endpoints: resource.status.endpoints ?? [],
          status: InstanceStatus.ERRORED,
        }
      }

      return {
        kind: 'instancerInstanceDetails',
        timeLeftMilliseconds: Math.max(0, new Date(resource.spec.expiresAt).getTime() - Date.now()),
        endpoints: resource.status.endpoints ?? [],
        status: readyStatus?.status === 'True' ? InstanceStatus.RUNNING : InstanceStatus.STARTING,
      }
    } catch (err: any) {
      if (err.code === 404) {
        return {
          kind: 'instancerInstanceDetails',
          timeLeftMilliseconds: 0,
          endpoints: [],
          status: InstanceStatus.STOPPED,
        }
      }

      console.error('Failed to fetch instancer status', err)
      return {
        kind: 'instancerError',
        message: 'Something went wrong while trying to fetch instancer status',
      }
    }
  }

  extendInstance = async (
    options: ExtendInstanceOptions
  ): Promise<instanceDetailsOrError> => {
    await this.client.patchClusterCustomObject({
      group,
      version,
      plural,
      name: this.getResourceName(options.teamId, options.challengeIntegrationId),
      body: [
        {
          op: 'replace',
          path: '/spec/expiresAt',
          value: new Date(Date.now() + options.timeoutMilliseconds).toISOString(),
        },
      ],
    })

    return this.getInstance(options)
  }
}