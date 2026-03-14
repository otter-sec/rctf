import {
  CustomObjectsApi,
  KubeConfig,
  ResponseContext,
  wrapHttpLibrary,
} from '@kubernetes/client-node'
import * as z from 'zod/mini'
import {
  InstanceStatus,
  type CreateInstanceOptions,
  type ExtendInstanceOptions,
  type instanceDetailsOrError,
  type InstanceQueryOptions,
  type InstancerProvider,
  type ProviderConfig,
} from './base'

const group = 'rctf-instancer.osec.io'
const version = 'v1'
const plural = 'challengeinstances'

interface K8sInstancerProviderOptions {
  authToken: string
  apiUrl: string
  caCertificate: string
}

const defaultPod = {
  name: 'app',
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
        name: 'app',
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
  },
}

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L1237-L1248
const protocolSchema = z.enum(['TCP', 'UDP', 'SCTP'])

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L6186-L6245
const servicePortSchema = z.catchall(
  z.object({
    name: z
      .optional(z.string().check(z.minLength(1)))
      .check(z.describe('Service name')),
    protocol: z.optional(protocolSchema).check(z.describe('Service protocol')),
    port: z.int32().check(z.gte(1), z.lte(65535), z.describe('Service port')),
    targetPort: z
      .optional(
        z.union([
          z.int32().check(z.gte(1), z.lte(65535)),
          z.string().check(z.minLength(1)),
        ])
      )
      .check(z.describe('Service target port')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L6954-L6983
const resourceListSchema = z.catchall(
  z.object({
    cpu: z.optional(z.string()).check(z.describe('CPU')),
    memory: z.optional(z.string()).check(z.describe('Memory')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L2830-L2855
const resourcesSchema = z.catchall(
  z.object({
    limits: z.optional(resourceListSchema).check(z.describe('Limits')),
    requests: z.optional(resourceListSchema).check(z.describe('Requests')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L8204-L8286
const securityContextSchema = z.catchall(
  z.object({
    // https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L2815-L2828
    capabilities: z
      .optional(
        z.object({
          add: z.optional(z.array(z.string())).check(z.describe('Add')),
          drop: z.optional(z.array(z.string())).check(z.describe('Drop')),
        })
      )
      .check(z.describe('Capabilities')),
    privileged: z
      .prefault(z.optional(z.boolean()), false)
      .check(z.describe('Privileged')),
    // technically these should be int64, but we can't represent BigInt in JSON properly :'(
    runAsUser: z
      .optional(z.int().check(z.gte(0)))
      .check(z.describe('Run as user')),
    runAsGroup: z
      .optional(z.int().check(z.gte(0)))
      .check(z.describe('Run as group')),
    runAsNonRoot: z.prefault(
      z.optional(z.boolean()).check(z.describe('Run as non root')),
      false
    ),
    readOnlyRootFilesystem: z
      .prefault(z.optional(z.boolean()), false)
      .check(z.describe('Read only root filesystem')),
    allowPrivilegeEscalation: z
      .prefault(z.optional(z.boolean()), false)
      .check(z.describe('Allow privilege escalation')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L2692-L2702
const execActionSchema = z.catchall(
  z.object({
    command: z
      .optional(z.array(z.string().check(z.minLength(1))))
      .check(z.describe('Command')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L2624-L2665
const httpGetActionSchema = z.catchall(
  z.object({
    path: z
      .optional(z.string().check(z.minLength(1)))
      .check(z.describe('Path')),
    port: z
      .union([z.int32().check(z.gte(1), z.lte(65535)), z.string()])
      .check(z.describe('Port')),
    host: z
      .optional(z.string().check(z.minLength(1)))
      .check(z.describe('Host')),
    scheme: z.optional(z.enum(['HTTP', 'HTTPS'])).check(z.describe('Scheme')),
    httpHeaders: z
      .optional(
        z.array(
          z.object({
            name: z.string().check(z.minLength(1)),
            value: z.string().check(z.minLength(1)),
          })
        )
      )
      .check(z.describe('HTTP headers')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L2667-L2676
const tcpSocketActionSchema = z.catchall(
  z.object({
    port: z
      .union([z.int32().check(z.gte(1), z.lte(65535)), z.string()])
      .check(z.describe('Port')),
    host: z.optional(z.string()).check(z.describe('Host')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L2710-L2748
const probeSchema = z.catchall(
  z.object({
    initialDelaySeconds: z
      .optional(z.int32().check(z.gte(1)))
      .check(z.describe('Initial delay seconds')),
    timeoutSeconds: z
      .optional(z.int32().check(z.gte(1)))
      .check(z.describe('Timeout seconds')),
    periodSeconds: z
      .optional(z.int32().check(z.gte(1)))
      .check(z.describe('Period seconds')),
    successThreshold: z
      .optional(z.int32().check(z.gte(1)))
      .check(z.describe('Success threshold')),
    failureThreshold: z
      .optional(z.int32().check(z.gte(1)))
      .check(z.describe('Failure threshold')),
    // https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L3106-L3121
    exec: z.optional(execActionSchema).check(z.describe('Execute')),
    httpGet: z.optional(httpGetActionSchema).check(z.describe('HTTP GET')),
    tcpSocket: z
      .optional(tcpSocketActionSchema)
      .check(z.describe('TCP socket')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L2367-L2414
const volumeMountSchema = z.catchall(
  z.object({
    name: z.string().check(z.minLength(1), z.describe('Name')),
    readOnly: z.optional(z.boolean()).check(z.describe('Read only')),
    mountPath: z.string().check(z.minLength(1), z.describe('Mount path')),
    subPath: z
      .optional(z.string().check(z.minLength(1)))
      .check(z.describe('Sub path')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L3662-L3670
const restartPolicyEnum = z.enum(['Always', 'OnFailure', 'Never'])

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L2750-L2761
const imagePullPolicyEnum = z.enum(['Always', 'Never', 'IfNotPresent'])

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L2341-L2365
const containerPortSchema = z.catchall(
  z.object({
    name: z
      .optional(z.string().check(z.minLength(1)))
      .check(z.describe('Name')),
    hostPort: z
      .optional(z.int32().check(z.gte(1), z.lte(65535)))
      .check(z.describe('Host port')),
    containerPort: z
      .optional(z.int32().check(z.gte(1), z.lte(65535)))
      .check(z.describe('Container port')),
    protocol: z.optional(protocolSchema).check(z.describe('Protocol')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L2462-L2484
const envVarSchema = z.catchall(
  z.object({
    name: z.string().check(z.minLength(1), z.describe('Name')),
    value: z
      .optional(z.string().check(z.minLength(1)))
      .check(z.describe('Value')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L2898-L3104
const containerSchema = z.catchall(
  z.object({
    name: z.string().check(z.minLength(1), z.describe('Name')),
    // technically optional but there shouldn't be a valid use-case where this is left empty with instancer in the mix
    image: z.string().check(z.minLength(1), z.describe('Image')),
    command: z.optional(z.array(z.string())).check(z.describe('Command')),
    args: z.optional(z.array(z.string())).check(z.describe('Args')),
    workingDir: z
      .optional(z.string().check(z.minLength(1)))
      .check(z.describe('Working dir')),
    ports: z.optional(z.array(containerPortSchema)).check(z.describe('Ports')),
    env: z.optional(z.array(envVarSchema)).check(z.describe('Env')),
    resources: z.optional(resourcesSchema).check(z.describe('Resources')),
    restartPolicy: z
      .optional(restartPolicyEnum)
      .check(z.describe('Restart policy')),
    volumeMounts: z
      .optional(z.array(volumeMountSchema))
      .check(z.describe('Volume mounts')),
    livenessProbe: z.optional(probeSchema).check(z.describe('Liveness probe')),
    readinessProbe: z
      .optional(probeSchema)
      .check(z.describe('Readiness probe')),
    imagePullPolicy: z
      .optional(imagePullPolicyEnum)
      .check(z.describe('Image pull policy')),
    securityContext: z
      .optional(securityContextSchema)
      .check(z.describe('Security context')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L35-L222
const volumeSchema = z.catchall(
  z.object({
    name: z.string().check(z.minLength(1), z.describe('Name')),

    // https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L924-L936
    hostPath: z
      .optional(
        z.catchall(
          z.object({
            path: z.string().check(z.describe('Path')),
            // https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L900-L922
            type: z
              .optional(
                z.enum([
                  '',
                  'DirectoryOrCreate',
                  'Directory',
                  'FileOrCreate',
                  'File',
                  'Socket',
                  'CharDevice',
                  'BlockDevice',
                ])
              )
              .check(z.describe('Type')),
          }),
          z.any()
        )
      )
      .check(z.describe('Host path')),

    // https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L938-L955
    emptyDir: z
      .optional(
        z.catchall(
          z.object({
            // https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L1227-L1235
            medium: z
              .prefault(z.enum(['', 'Memory', 'HugePages', 'HugePages-']), '')
              .check(z.describe('Medium')),
            sizeLimit: z.optional(z.string()).check(z.describe('Size limit')),
          }),
          z.any()
        )
      )
      .check(z.describe('Empty dir')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L5027-L5059
const dnsConfigSchema = z.catchall(
  z.object({
    nameservers: z
      .optional(z.array(z.string()))
      .check(z.describe('Nameservers')),
    searches: z.optional(z.array(z.string())).check(z.describe('Searches')),
    options: z
      .optional(
        z.array(
          z.catchall(
            z.object({
              name: z.string().check(z.minLength(1), z.describe('Name')),
              value: z.optional(z.string()).check(z.describe('Value')),
            }),
            z.any()
          )
        )
      )
      .check(z.describe('Options')),
  }),
  z.any()
)

// https://github.com/kubernetes/api/blob/13152125c196531c20cae818abd3791701da6d80/core/v1/types.go#L4120-L4475
const podSpecSchema = z.catchall(
  z.object({
    volumes: z.optional(z.array(volumeSchema)).check(z.describe('Volumes')),
    initContainers: z
      .optional(z.array(containerSchema))
      .check(z.describe('Init containers')),
    containers: z
      .optional(z.array(containerSchema))
      .check(z.describe('Containers')),
    restartPolicy: z
      .optional(restartPolicyEnum)
      .check(z.describe('Restart policy')),
    terminationGracePeriodSeconds: z
      .optional(z.int().check(z.gte(0)))
      .check(z.describe('Termination grace period seconds')),
    automountServiceAccountToken: z
      .optional(z.prefault(z.boolean(), false))
      .check(z.describe('Automount service account token')),
    securityContext: z
      .optional(securityContextSchema)
      .check(z.describe('Security context')),
    hostname: z
      .optional(z.string().check(z.minLength(1), z.maxLength(64)))
      .check(z.describe('Hostname')),
    dnsConfig: z.optional(dnsConfigSchema).check(z.describe('DNS config')),
    resources: z.optional(resourcesSchema).check(z.describe('Resources')),
  }),
  z.any()
)

// ChallengeInstancePod
const podSchema = z.object({
  name: z.string().check(z.describe('Name')),
  ports: z.array(servicePortSchema).check(z.describe('Ports')),
  spec: podSpecSchema.check(z.describe('Pod spec')),
  egress: z.optional(z.boolean()).check(z.describe('Egress')),
})

// ChallengeInstanceSpec
const k8sInstancerConfigSchema = z.object({
  pods: z
    .optional(z.prefault(z.array(podSchema), [defaultPod]))
    .check(z.describe('Pods')),
})

export default class K8sInstancerProvider implements InstancerProvider {
  private readonly client: CustomObjectsApi

  readonly configSchema = k8sInstancerConfigSchema

  constructor(_options: unknown) {
    const options = {
      authToken:
        process.env.K8S_INSTANCER_AUTH_TOKEN ??
        (_options as K8sInstancerProviderOptions).authToken,
      apiUrl:
        process.env.K8S_INSTANCER_API_URL ??
        (_options as K8sInstancerProviderOptions).apiUrl,
      caCertificate:
        process.env.K8S_INSTANCER_CA_CERTIFICATE ??
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
        },
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
            rejectUnauthorized: true,
          },
        } as any)

        return new ResponseContext(
          response.status,
          Object.fromEntries((response.headers as any).entries()),
          {
            text: () => response.text(),
            binary: async () => Buffer.from(await response.arrayBuffer()),
          }
        )
      },
    })
  }

  private getResourceName(
    teamId: string,
    challengeIntegrationId: string
  ): string {
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
            name: this.getResourceName(
              options.teamId,
              options.challengeIntegrationId
            ),
          },
          spec: {
            ...options.config,
            expose: options.expose,
            teamId: options.teamId,
            challengeId: options.challengeIntegrationId,
            expiresAt: new Date(
              Date.now() + options.timeoutMilliseconds
            ).toISOString(),
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
        name: this.getResourceName(
          options.teamId,
          options.challengeIntegrationId
        ),
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
        name: this.getResourceName(
          options.teamId,
          options.challengeIntegrationId
        ),
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

      // hasn't been reconciled yet
      if (!resource.status?.conditions) {
        return {
          kind: 'instancerInstanceDetails',
          timeLeftMilliseconds: 0,
          endpoints: [],
          status: InstanceStatus.STARTING,
        }
      }

      const readyStatus = resource.status.conditions.find(
        (condition: any) => condition.type === 'Ready'
      )
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
        timeLeftMilliseconds: Math.max(
          0,
          new Date(resource.spec.expiresAt).getTime() - Date.now()
        ),
        endpoints: resource.status.endpoints ?? [],
        status:
          readyStatus?.status === 'True'
            ? InstanceStatus.RUNNING
            : InstanceStatus.STARTING,
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

      // TODO(es3n1n): logger
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
      name: this.getResourceName(
        options.teamId,
        options.challengeIntegrationId
      ),
      body: [
        {
          op: 'replace',
          path: '/spec/expiresAt',
          value: new Date(
            Date.now() + options.timeoutMilliseconds
          ).toISOString(),
        },
      ],
    })

    return this.getInstance(options)
  }
}
