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

const DOCKER_IMAGE_REGEX =
  /^(?:(?:[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?::[0-9]+)?\/)?[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?:\/[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)*)(?::[a-z0-9][a-z0-9._-]{0,127})?(?:@sha256:[a-f0-9]{64})?$/i
const MEMORY_SIZE_REGEX = /^[1-9]\d*[bkmgBKMG]?$/
const DURATION_REGEX = /^(?:0|[1-9]\d*)(?:ns|us|µs|ms|s|m|h)$/
const HOSTNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i
const IP_ADDRESS_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$|^(?:[a-f0-9]{1,4}:){7}[a-f0-9]{1,4}$|^::(?:[a-f0-9]{1,4}:){0,6}[a-f0-9]{1,4}$|^(?:[a-f0-9]{1,4}:){1,6}::$|^(?:[a-f0-9]{1,4}:){1,5}::[a-f0-9]{1,4}$|^(?:[a-f0-9]{1,4}:){1,4}(?::[a-f0-9]{1,4}){1,2}$|^(?:[a-f0-9]{1,4}:){1,3}(?::[a-f0-9]{1,4}){1,3}$|^(?:[a-f0-9]{1,4}:){1,2}(?::[a-f0-9]{1,4}){1,4}$|^[a-f0-9]{1,4}:(?::[a-f0-9]{1,4}){1,5}$|^::$/i
const ABSOLUTE_PATH_REGEX = /^\/(?:[^/\0]+\/?)*$/
const PORT_REGEX =
  /^(?:[1-9]\d{0,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])(?:\/(?:tcp|udp|sctp))?$/
const EXTRA_HOST_REGEX =
  /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?:(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/i
const VOLUME_MOUNT_REGEX =
  /^[a-z0-9][a-z0-9_.-]*:\/[^:]*(?::(?:ro|rw|z|Z|shared|slave|private|rshared|rslave|rprivate|nocopy|delegated|cached)(?:,(?:ro|rw|z|Z|shared|slave|private|rshared|rslave|rprivate|nocopy|delegated|cached))*)?$/i
const USER_REGEX =
  /^(?:[a-z_][a-z0-9_-]*|[0-9]+)(?::[a-z_][a-z0-9_-]*|:[0-9]+)?$/i
const SYSCTL_KEY_REGEX = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/i
const LABEL_KEY_REGEX =
  /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)*$/i
const ENV_VAR_KEY_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/
const NAME_REGEX = /^[a-z0-9][a-z0-9_.-]*$/i
const SERVICE_NAME_REGEX = /^[a-z][a-z0-9_-]*$/i
const DNS_DOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i

const LINUX_CAPABILITIES = [
  'ALL',
  'AUDIT_CONTROL',
  'AUDIT_READ',
  'AUDIT_WRITE',
  'BLOCK_SUSPEND',
  'BPF',
  'CHECKPOINT_RESTORE',
  'CHOWN',
  'DAC_OVERRIDE',
  'DAC_READ_SEARCH',
  'FOWNER',
  'FSETID',
  'IPC_LOCK',
  'IPC_OWNER',
  'KILL',
  'LEASE',
  'LINUX_IMMUTABLE',
  'MAC_ADMIN',
  'MAC_OVERRIDE',
  'MKNOD',
  'NET_ADMIN',
  'NET_BIND_SERVICE',
  'NET_BROADCAST',
  'NET_RAW',
  'PERFMON',
  'SETFCAP',
  'SETGID',
  'SETPCAP',
  'SETUID',
  'SYS_ADMIN',
  'SYS_BOOT',
  'SYS_CHROOT',
  'SYS_MODULE',
  'SYS_NICE',
  'SYS_PACCT',
  'SYS_PTRACE',
  'SYS_RAWIO',
  'SYS_RESOURCE',
  'SYS_TIME',
  'SYS_TTY_CONFIG',
  'SYSLOG',
  'WAKE_ALARM',
] as const

const ULIMIT_NAMES = [
  'core',
  'cpu',
  'data',
  'fsize',
  'locks',
  'memlock',
  'msgqueue',
  'nice',
  'nofile',
  'nproc',
  'rss',
  'rtprio',
  'rttime',
  'sigpending',
  'stack',
] as const

// TODO(es3n1n): depends_on
const serviceSchema = z.object({
  image: z
    .string()
    .min(1)
    .regex(DOCKER_IMAGE_REGEX, 'Invalid Docker image format')
    .describe('Docker image'),
  hostname: z
    .string()
    .max(63)
    .regex(HOSTNAME_REGEX, 'Invalid hostname')
    .nullable()
    .default(null)
    .describe('Container hostname'),
  environment: z
    .record(z.string().regex(ENV_VAR_KEY_REGEX), z.string())
    .default({})
    .describe('Environment variables'),
  command: z
    .string()
    .min(1)
    .nullable()
    .default(null)
    .describe('Override default command'),
  entrypoint: z
    .string()
    .min(1)
    .nullable()
    .default(null)
    .describe('Override default entrypoint'),
  working_dir: z
    .string()
    .regex(ABSOLUTE_PATH_REGEX, 'Must be absolute path')
    .nullable()
    .default(null)
    .describe('Working directory'),
  user: z
    .string()
    .regex(USER_REGEX, 'Invalid user format')
    .nullable()
    .default(null)
    .describe('User to run as'),
  networks: z
    .array(z.string().min(1).max(64).regex(NAME_REGEX))
    .default([])
    .describe('Networks to connect to'),
  network_mode: z
    .enum(['bridge', 'host', 'none'])
    .optional()
    .describe('Network mode (e.g., host, bridge)'),
  dns: z
    .array(z.string().regex(IP_ADDRESS_REGEX, 'Invalid IP'))
    .default([])
    .describe('Custom DNS servers'),
  dns_opt: z
    .array(z.string().min(1).max(255))
    .default([])
    .describe('DNS options'),
  dns_search: z
    .array(z.string().min(1).max(253).regex(DNS_DOMAIN_REGEX))
    .default([])
    .describe('DNS search domains'),
  extra_hosts: z
    .array(z.string().regex(EXTRA_HOST_REGEX, 'Expected host:ip'))
    .default([])
    .describe('Extra /etc/hosts entries (host:ip)'),
  expose: z
    .array(z.string().regex(PORT_REGEX, 'Invalid port'))
    .default([])
    .describe('Expose ports without publishing'),
  volumes: z
    .array(z.string().regex(VOLUME_MOUNT_REGEX, 'Invalid mount'))
    .default([])
    .describe('Volume mounts (volume:path)'),
  tmpfs: z
    .record(z.string().regex(ABSOLUTE_PATH_REGEX), z.string().min(1))
    .default({})
    .describe('Tmpfs mounts and their mount options'),
  shm_size: z
    .string()
    .regex(MEMORY_SIZE_REGEX, 'Invalid size')
    .nullable()
    .default(null)
    .describe('Size of /dev/shm (e.g., 64m)'),
  healthcheck: z
    .object({
      test: z.array(z.string().min(1)).min(1).describe('Command to run'),
      interval: z
        .string()
        .regex(DURATION_REGEX)
        .default('30s')
        .describe('Interval between checks'),
      timeout: z
        .string()
        .regex(DURATION_REGEX)
        .default('10s')
        .describe('Timeout for each check'),
      retries: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(3)
        .describe('Retries before unhealthy'),
      start_period: z
        .string()
        .regex(DURATION_REGEX)
        .default('0s')
        .describe('Start period'),
    })
    .nullable()
    .default(null)
    .describe('Container health check'),
  read_only: z.boolean().default(true).describe('Read-only root filesystem'),
  privileged: z.boolean().default(false).describe('Privileged mode'),
  security_opt: z
    .array(z.string().min(1).max(255))
    .default(['no-new-privileges'])
    .describe('Security options'),
  cap_add: z
    .array(z.enum(LINUX_CAPABILITIES))
    .default([])
    .describe('Add capabilities'),
  cap_drop: z
    .array(z.enum(LINUX_CAPABILITIES))
    .default(['ALL'])
    .describe('Drop capabilities'),
  mem_limit: z
    .string()
    .regex(MEMORY_SIZE_REGEX)
    .default('6m')
    .describe('Memory limit (e.g., 256m, 1g)'),
  cpus: z.number().positive().max(1024).default(1.0).describe('CPU limit'),
  pids_limit: z
    .number()
    .int()
    .min(-1)
    .max(65536)
    .default(64)
    .describe('PIDs limit'),
  ulimits: z
    .record(
      z.enum(ULIMIT_NAMES),
      z
        .object({
          soft: z.number().int().nonnegative(),
          hard: z.number().int().nonnegative(),
        })
        .refine(d => d.soft <= d.hard, 'soft must be <= hard')
    )
    .default({ nofile: { soft: 1024, hard: 1024 } })
    .describe('Ulimits'),
  sysctls: z
    .record(z.string().regex(SYSCTL_KEY_REGEX), z.string().min(1))
    .default({})
    .describe('Sysctl settings'),
  labels: z
    .record(z.string().regex(LABEL_KEY_REGEX), z.string())
    .default({})
    .describe('Container labels'),
  restart: z
    .enum(['no', 'always', 'on-failure', 'unless-stopped'])
    .default('unless-stopped')
    .describe('Restart policy'),
})

const networkSchema = z.object({
  driver: z
    .enum(['bridge', 'host', 'none'])
    .default('bridge')
    .describe('Network driver'),
  internal: z.boolean().default(true).describe('Disable external access'),
  driver_opts: z
    .record(z.string().min(1).max(255), z.string().max(4096))
    .default({})
    .describe('Driver options'),
})

const volumeSchema = z.object({
  driver: z
    .enum(['local', 'nfs', 'tmpfs'])
    .default('local')
    .describe('Volume driver'),
  driver_opts: z
    .record(z.string().min(1).max(255), z.string().max(4096))
    .default({})
    .describe('Driver options'),
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
  tmpfs: { '/tmp': 'rw,noexec,nosuid,nodev,size=65536k' },
  read_only: true,
  privileged: false,
  security_opt: ['no-new-privileges'],
  cap_add: [] as (typeof LINUX_CAPABILITIES)[number][],
  cap_drop: ['ALL'] as (typeof LINUX_CAPABILITIES)[number][],
  mem_limit: '6m',
  cpus: 1.0,
  pids_limit: 64,
  ulimits: { nofile: { soft: 1024, hard: 1024 } },
  sysctls: {},
  labels: {},
  restart: 'unless-stopped' as const,
}

const tinyInstancerConfigSchema = z
  .object({
    services: z
      .record(
        z.string().min(1).max(64).regex(SERVICE_NAME_REGEX),
        serviceSchema
      )
      .default({ app: defaultService })
      .describe('Service definitions'),
    networks: z
      .record(z.string().min(1).max(64).regex(NAME_REGEX), networkSchema)
      .default({
        internal: { driver: 'bridge', internal: true, driver_opts: {} },
      })
      .describe('Network definitions'),
    volumes: z
      .record(z.string().min(1).max(255).regex(NAME_REGEX), volumeSchema)
      .default({})
      .describe('Volume definitions'),
  })
  .refine(
    data => Object.keys(data.services).length > 0,
    'At least one service required'
  )
  .refine(data => {
    const nets = new Set(Object.keys(data.networks))
    return Object.values(data.services).every(s =>
      s.networks.every(n => nets.has(n))
    )
  }, 'Services reference undefined networks')
  .refine(data => {
    const vols = new Set(Object.keys(data.volumes))
    return Object.values(data.services).every(s =>
      s.volumes.every(m => {
        const name = m.split(':')[0] ?? ''
        return (
          !name ||
          name.startsWith('/') ||
          name.startsWith('.') ||
          vols.has(name)
        )
      })
    )
  }, 'Services reference undefined volumes')

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
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
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

  // NOTE(es3n1n): Providers are guaranteed to return endpoints in the same order as the expose config
  getInstance = async (
    options: InstanceQueryOptions
  ): Promise<instanceDetailsOrError> => {
    return this.apiRequest('v1/instances/', 'POST', {
      kind: 'instancerGetInstanceForm',
      rctfAuthToken: this.authToken,
      ...options,
    })
  }

  extendInstance = async (
    options: InstanceQueryOptions
  ): Promise<instanceDetailsOrError> => {
    return this.apiRequest('v1/instances/', 'PATCH', {
      kind: 'instancerRenewInstanceForm',
      rctfAuthToken: this.authToken,
      ...options,
    })
  }
}
