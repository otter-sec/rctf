import { z } from 'zod'
import {
  instanceDetailsSchema,
  instancerErrorSchema,
  type CreateInstanceOptions,
  type instanceDetailsOrError,
  type InstanceQueryOptions,
  type InstancerProvider,
  type ProviderConfig,
} from './base'

interface TinyInstancerProviderOptions {
  authToken: string
  apiUrl: string
}

// TODO(es3n1n): depends_on
const serviceSchema = z.object({
  image: z.string().min(1).describe('Docker image'),
  hostname: z.string().optional().describe('Container hostname'),
  environment: z
    .record(z.string(), z.string())
    .default({})
    .describe('Environment variables'),
  command: z.string().optional().describe('Override default command'),
  entrypoint: z.string().optional().describe('Override default entrypoint'),
  working_dir: z.string().optional().describe('Working directory'),
  user: z.string().optional().describe('User to run as'),
  networks: z.array(z.string()).default([]).describe('Networks to connect to'),
  network_mode: z
    .string()
    .optional()
    .describe('Network mode (e.g., host, bridge)'),
  dns: z.array(z.string()).default([]).describe('Custom DNS servers'),
  dns_opt: z.array(z.string()).default([]).describe('DNS options'),
  dns_search: z.array(z.string()).default([]).describe('DNS search domains'),
  extra_hosts: z
    .array(z.string())
    .default([])
    .describe('Extra /etc/hosts entries (host:ip)'),
  expose: z
    .array(z.string())
    .default([])
    .describe('Expose ports without publishing'),
  volumes: z
    .array(z.string())
    .default([])
    .describe('Volume mounts (volume:path or path:path)'),
  tmpfs: z.array(z.string()).default([]).describe('Tmpfs mounts'),
  shm_size: z.string().optional().describe('Size of /dev/shm (e.g., 64m)'),
  healthcheck: z
    .object({
      test: z.array(z.string()).describe('Command to run'),
      interval: z.string().default('30s').describe('Interval between checks'),
      timeout: z.string().default('10s').describe('Timeout for each check'),
      retries: z.number().int().default(3).describe('Retries before unhealthy'),
      start_period: z.string().default('0s').describe('Start period'),
    })
    .optional()
    .describe('Container health check'),
  read_only: z.boolean().default(true).describe('Read-only root filesystem'),
  privileged: z.boolean().default(false).describe('Privileged mode'),
  security_opt: z.array(z.string()).default([]).describe('Security options'),
  cap_add: z.array(z.string()).default([]).describe('Add capabilities'),
  cap_drop: z.array(z.string()).default(['ALL']).describe('Drop capabilities'),
  mem_limit: z.string().default('6m').describe('Memory limit (e.g., 256m, 1g)'),
  cpus: z.number().default(1).describe('CPU limit'),
  pids_limit: z.number().int().default(64).describe('PIDs limit'),
  ulimits: z
    .record(
      z.string(),
      z.object({
        soft: z.number().int(),
        hard: z.number().int(),
      })
    )
    .default({})
    .describe('Ulimits'),
  sysctls: z
    .record(z.string(), z.string())
    .default({})
    .describe('Sysctl settings'),
  labels: z
    .record(z.string(), z.string())
    .default({})
    .describe('Container labels'),
  restart: z
    .enum(['no', 'always', 'on-failure', 'unless-stopped'])
    .default('unless-stopped')
    .describe('Restart policy'),
})

const networkSchema = z.object({
  driver: z.enum(['bridge', 'host', 'none']).default('bridge'),
  internal: z.boolean().default(true).describe('Disable external access'),
  driver_opts: z.record(z.string(), z.string()).default({}),
})

const volumeSchema = z.object({
  driver: z.string().default('local'),
  driver_opts: z.record(z.string(), z.string()).default({}),
})

const defaultService = {
  image: 'traefik/whoami:latest',
  environment: { tiny: 'instancer' },
  networks: ['internal'],
  dns: [],
  dns_opt: [],
  dns_search: [],
  extra_hosts: [],
  ports: [],
  expose: [],
  volumes: [],
  tmpfs: [],
  read_only: true,
  privileged: false,
  security_opt: ['no-new-privileges'],
  cap_add: [],
  cap_drop: ['ALL'],
  mem_limit: '6m',
  cpus: 1.0,
  pids_limit: 64,
  ulimits: { nofile: { soft: 1024, hard: 1024 } },
  sysctls: {},
  labels: {},
  restart: 'unless-stopped' as const,
}

const tinyInstancerConfigSchema = z.object({
  services: z
    .record(z.string(), serviceSchema)
    .default({ app: defaultService })
    .describe('Service definitions'),
  networks: z
    .record(z.string(), networkSchema)
    .default({
      internal: { driver: 'bridge', internal: true, driver_opts: {} },
    })
    .describe('Network definitions'),
  volumes: z
    .record(z.string(), volumeSchema)
    .default({})
    .describe('Volume definitions'),
})

export default class TinyInstancerProvider implements InstancerProvider {
  private readonly authToken: string
  private readonly apiUrl: string

  readonly configSchema = tinyInstancerConfigSchema

  constructor(_options: unknown) {
    const options = {
      authToken:
        process.env.TINY_INSTANCER_AUTH_TOKEN ??
        (_options as TinyInstancerProviderOptions).authToken,
      apiUrl:
        process.env.TINY_INSTANCER_API_URL ??
        (_options as TinyInstancerProviderOptions).apiUrl,
    } as TinyInstancerProviderOptions

    if (!options.authToken || !options.apiUrl) {
      throw new Error(
        'Missing one of the authToken or apiUrl for the TinyInstancerProvider.'
      )
    }

    this.authToken = options.authToken
    this.apiUrl = options.apiUrl.replace(/\/$/, '')
  }

  getDefaults = (): ProviderConfig => this.configSchema.parse({})

  private async apiRequest(
    path: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body?: unknown
  ): Promise<instanceDetailsOrError> {
    const response = await fetch(`${this.apiUrl}/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = (await response.json()) as instanceDetailsOrError
    if (data.kind === instancerErrorSchema.shape.kind.value) {
      return instancerErrorSchema.parse(data)
    }

    return instanceDetailsSchema.parse(data)
  }

  createInstance = async (
    options: CreateInstanceOptions
  ): Promise<instanceDetailsOrError> => {
    return this.apiRequest('v1/instances/', 'PUT', {
      kind: 'instancerCreateInstanceForm',
      rctfAuthToken: this.authToken,
      ...options,
    })
  }

  deleteInstance = async (
    options: InstanceQueryOptions
  ): Promise<instanceDetailsOrError> => {
    return this.apiRequest('v1/instances/', 'DELETE', {
      kind: 'instancerDeleteInstanceForm',
      rctfAuthToken: this.authToken,
      ...options,
    })
  }

  getInstance = async (
    options: InstanceQueryOptions
  ): Promise<instanceDetailsOrError> => {
    return this.apiRequest('v1/instances/', 'POST', {
      kind: 'instancerGetInstanceForm',
      rctfAuthToken: this.authToken,
      ...options,
    })
  }
}
