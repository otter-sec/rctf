import * as z from 'zod/mini'
import {
  instanceDetailsSchema,
  instancerErrorSchema,
  InstancerProvider,
  type CreateInstanceOptions,
  type ExtendInstanceOptions,
  type instanceDetailsOrError,
  type InstanceQueryOptions,
  type ProviderConfig,
} from './base'
import { docker, linux, net } from './util'

interface TinyInstancerProviderOptions {
  authToken: string
  apiUrl: string
}

// TODO(es3n1n): depends_on
const serviceSchema = z.object({
  image: z
    .string()
    .check(
      z.minLength(1),
      z.regex(docker.IMAGE_REGEX, 'Invalid Docker image format'),
      z.describe('Docker image')
    ),
  hostname: z
    .optional(
      z.prefault(
        z.nullable(
          z
            .string()
            .check(
              z.maxLength(63),
              z.regex(net.HOSTNAME_REGEX, 'Invalid hostname')
            )
        ),
        null
      )
    )
    .check(z.describe('Container hostname')),
  environment: z
    .optional(
      z.prefault(
        z.record(z.string().check(z.regex(linux.ENV_VAR_REGEX)), z.string()),
        {}
      )
    )
    .check(z.describe('Environment variables')),
  command: z
    .optional(z.prefault(z.nullable(z.string().check(z.minLength(1))), null))
    .check(z.describe('Override default command')),
  entrypoint: z
    .optional(z.prefault(z.nullable(z.string().check(z.minLength(1))), null))
    .check(z.describe('Override default entrypoint')),
  working_dir: z
    .optional(
      z.prefault(
        z.nullable(
          z
            .string()
            .check(z.regex(linux.ABSOLUTE_PATH_REGEX, 'Must be absolute path'))
        ),
        null
      )
    )
    .check(z.describe('Working directory')),
  user: z
    .optional(
      z.prefault(
        z.nullable(
          z.string().check(z.regex(linux.USER_REGEX, 'Invalid user format'))
        ),
        null
      )
    )
    .check(z.describe('User to run as')),
  networks: z
    .optional(
      z.prefault(
        z.array(
          z
            .string()
            .check(z.minLength(1), z.maxLength(64), z.regex(docker.NAME_REGEX))
        ),
        []
      )
    )
    .check(z.describe('Networks to connect to')),
  network_mode: z
    .optional(z.enum(['bridge', 'host', 'none']))
    .check(z.describe('Network mode (e.g., host, bridge)')),
  dns: z
    .optional(z.prefault(z.array(z.union([z.ipv4(), z.ipv6()])), []))
    .check(z.describe('Custom DNS servers')),
  dns_opt: z
    .optional(
      z.prefault(
        z.array(z.string().check(z.minLength(1), z.maxLength(255))),
        []
      )
    )
    .check(z.describe('DNS options')),
  dns_search: z
    .optional(
      z.prefault(
        z.array(
          z
            .string()
            .check(
              z.minLength(1),
              z.maxLength(253),
              z.regex(net.DNS_DOMAIN_REGEX)
            )
        ),
        []
      )
    )
    .check(z.describe('DNS search domains')),
  extra_hosts: z
    .optional(
      z.prefault(
        z.array(
          z.string().check(z.regex(net.EXTRA_HOST_REGEX, 'Expected host:ip'))
        ),
        []
      )
    )
    .check(z.describe('Extra /etc/hosts entries (host:ip)')),
  expose: z
    .optional(
      z.prefault(
        z.array(z.string().check(z.regex(net.PORT_REGEX, 'Invalid port'))),
        []
      )
    )
    .check(z.describe('Expose ports without publishing')),
  volumes: z
    .optional(
      z.prefault(
        z.array(
          z.string().check(z.regex(docker.VOLUME_MOUNT_REGEX, 'Invalid mount'))
        ),
        []
      )
    )
    .check(z.describe('Volume mounts (volume:path)')),
  tmpfs: z
    .optional(
      z.prefault(
        z.record(
          z.string().check(z.regex(linux.ABSOLUTE_PATH_REGEX)),
          z.string().check(z.minLength(1))
        ),
        {}
      )
    )
    .check(z.describe('Tmpfs mounts and their mount options')),
  shm_size: z
    .optional(
      z.prefault(
        z.nullable(
          z.string().check(z.regex(docker.MEMORY_SIZE_REGEX, 'Invalid size'))
        ),
        null
      )
    )
    .check(z.describe('Size of /dev/shm (e.g., 64m)')),
  healthcheck: z
    .optional(
      z.prefault(
        z.nullable(
          z.object({
            test: z
              .array(z.string().check(z.minLength(1)))
              .check(z.minLength(1))
              .check(z.describe('Command to run')),
            interval: z
              .optional(
                z.prefault(
                  z.string().check(z.regex(docker.DURATION_REGEX)),
                  '30s'
                )
              )
              .check(z.describe('Interval between checks')),
            timeout: z
              .optional(
                z.prefault(
                  z.string().check(z.regex(docker.DURATION_REGEX)),
                  '10s'
                )
              )
              .check(z.describe('Timeout for each check')),
            retries: z
              .optional(z.prefault(z.int().check(z.gte(1), z.lte(100)), 3))
              .check(z.describe('Retries before unhealthy')),
            start_period: z
              .optional(
                z.prefault(
                  z.string().check(z.regex(docker.DURATION_REGEX)),
                  '0s'
                )
              )
              .check(z.describe('Start period')),
          })
        ),
        null
      )
    )
    .check(z.describe('Container health check')),
  read_only: z
    .optional(z.prefault(z.boolean(), true))
    .check(z.describe('Read-only root filesystem')),
  privileged: z
    .optional(z.prefault(z.boolean(), false))
    .check(z.describe('Privileged mode')),
  security_opt: z
    .optional(
      z.prefault(z.array(z.string().check(z.minLength(1), z.maxLength(255))), [
        'no-new-privileges',
      ])
    )
    .check(z.describe('Security options')),
  cap_add: z
    .optional(z.prefault(z.array(z.enum(linux.CAPABILITIES)), []))
    .check(z.describe('Add capabilities')),
  cap_drop: z
    .optional(z.prefault(z.array(z.enum(linux.CAPABILITIES)), ['ALL']))
    .check(z.describe('Drop capabilities')),
  mem_limit: z
    .optional(
      z.prefault(z.string().check(z.regex(docker.MEMORY_SIZE_REGEX)), '6m')
    )
    .check(z.describe('Memory limit (e.g., 256m, 1g)')),
  cpus: z
    .optional(z.prefault(z.number().check(z.positive(), z.lte(1024)), 1.0))
    .check(z.describe('CPU limit')),
  pids_limit: z
    .optional(z.prefault(z.int().check(z.gte(-1), z.lte(65536)), 64))
    .check(z.describe('PIDs limit')),
  ulimits: z
    .optional(
      z.prefault(
        z.partialRecord(
          z.enum(linux.ULIMIT_NAMES),
          z.optional(
            z
              .object({
                soft: z.int().check(z.nonnegative()),
                hard: z.int().check(z.nonnegative()),
              })
              .check(z.refine(d => d.soft <= d.hard, 'soft must be <= hard'))
          )
        ),
        { nofile: { soft: 1024, hard: 1024 } }
      )
    )
    .check(z.describe('Ulimits')),
  sysctls: z
    .optional(
      z.prefault(
        z.record(
          z.string().check(z.regex(linux.SYSCTL_KEY_REGEX)),
          z.string().check(z.minLength(1))
        ),
        {}
      )
    )
    .check(z.describe('Sysctl settings')),
  labels: z
    .optional(
      z.prefault(
        z.record(z.string().check(z.regex(docker.LABEL_KEY_REGEX)), z.string()),
        {}
      )
    )
    .check(z.describe('Container labels')),
  restart: z
    .optional(
      z.prefault(
        z.enum(['no', 'always', 'on-failure', 'unless-stopped']),
        'unless-stopped'
      )
    )
    .check(z.describe('Restart policy')),
})

const networkSchema = z.object({
  driver: z
    .optional(z.prefault(z.enum(['bridge', 'host', 'none']), 'bridge'))
    .check(z.describe('Network driver')),
  internal: z
    .optional(z.prefault(z.boolean(), true))
    .check(z.describe('Disable external access')),
  driver_opts: z
    .optional(
      z.prefault(
        z.record(
          z.string().check(z.minLength(1), z.maxLength(255)),
          z.string().check(z.maxLength(4096))
        ),
        {}
      )
    )
    .check(z.describe('Driver options')),
})

const volumeSchema = z.object({
  driver: z
    .optional(z.prefault(z.enum(['local', 'nfs', 'tmpfs']), 'local'))
    .check(z.describe('Volume driver')),
  driver_opts: z
    .optional(
      z.prefault(
        z.record(
          z.string().check(z.minLength(1), z.maxLength(255)),
          z.string().check(z.maxLength(4096))
        ),
        {}
      )
    )
    .check(z.describe('Driver options')),
})

const defaultService = {
  image: 'traefik/whoami:latest',
  environment: { tiny: 'instancer' },
  networks: [],
  network_mode: 'none' as const,
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
  cap_add: [] as (typeof linux.CAPABILITIES)[number][],
  cap_drop: ['ALL'] as (typeof linux.CAPABILITIES)[number][],
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
      .optional(
        z.prefault(
          z.record(
            z
              .string()
              .check(
                z.minLength(1),
                z.maxLength(64),
                z.regex(docker.SERVICE_NAME_REGEX)
              ),
            serviceSchema
          ),
          { app: defaultService }
        )
      )
      .check(z.describe('Service definitions')),
    networks: z
      .optional(
        z.prefault(
          z.record(
            z
              .string()
              .check(
                z.minLength(1),
                z.maxLength(64),
                z.regex(docker.NAME_REGEX)
              ),
            networkSchema
          ),
          {}
        )
      )
      .check(z.describe('Network definitions')),
    volumes: z
      .optional(
        z.prefault(
          z.record(
            z
              .string()
              .check(
                z.minLength(1),
                z.maxLength(255),
                z.regex(docker.NAME_REGEX)
              ),
            volumeSchema
          ),
          {}
        )
      )
      .check(z.describe('Volume definitions')),
  })
  .check(
    z.refine(
      data => Object.keys(data.services ?? {}).length > 0,
      'At least one service required'
    )
  )
  .check(
    z.refine(data => {
      const nets = new Set(Object.keys(data.networks ?? {}))
      return Object.values(data.services ?? {}).every(s =>
        (s.networks ?? []).every(n => nets.has(n))
      )
    }, 'Services reference undefined networks')
  )
  .check(
    z.refine(data => {
      const vols = new Set(Object.keys(data.volumes ?? {}))
      return Object.values(data.services ?? {}).every(s =>
        (s.volumes ?? []).every(m => {
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
  )

export default class TinyInstancerProvider extends InstancerProvider {
  private readonly authToken: string
  private readonly apiUrl: string

  readonly configSchema = tinyInstancerConfigSchema
  readonly capabilities = { canStop: true, canExtend: true }

  constructor(_options: unknown) {
    super()
    const options = {
      authToken:
        process.env.DOCKER_INSTANCER_AUTH_TOKEN ??
        (_options as TinyInstancerProviderOptions).authToken,
      apiUrl:
        process.env.DOCKER_INSTANCER_API_URL ??
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
    if (data.kind === 'instancerError') {
      return instancerErrorSchema.parse(data)
    }

    return instanceDetailsSchema.parse(data)
  }

  createInstance = async (
    options: CreateInstanceOptions
  ): Promise<instanceDetailsOrError> => {
    const { user, ...rest } = options
    return this.apiRequest('v1/instances/', 'PUT', {
      kind: 'instancerCreateInstanceForm',
      rctfAuthToken: this.authToken,
      teamId: user.id,
      ...rest,
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
    options: ExtendInstanceOptions
  ): Promise<instanceDetailsOrError> => {
    return this.apiRequest('v1/instances/', 'PATCH', {
      kind: 'instancerRenewInstanceForm',
      rctfAuthToken: this.authToken,
      ...options,
    })
  }
}
