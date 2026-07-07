import { describe, expect, it } from 'bun:test'
import {
  classifyHeavy,
  decodeNodeId,
  deriveTree,
  encodeNodeId,
  nearestSurvivingPath,
  remapPathForArrayRemoval,
  remapPathForRename,
  WEIGHT_THRESHOLD,
  type TreeNode,
} from './tree'
import type { JsonSchema } from './types'

function objectOfStrings(propertyCount: number): JsonSchema {
  const properties: Record<string, JsonSchema> = {}
  for (let i = 0; i < propertyCount; i++) {
    properties[`field${i}`] = { type: 'string' }
  }
  return { type: 'object', properties }
}

const healthcheckSchema: JsonSchema = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object',
      title: 'Healthcheck',
      properties: {
        test: { type: 'array', items: { type: 'string' } },
        interval: { type: 'string' },
        timeout: { type: 'string' },
        retries: { type: 'integer' },
        start_period: { type: 'string' },
        start_interval: { type: 'string' },
        disable: { type: 'boolean' },
      },
    },
  ],
}

const serviceSchema: JsonSchema = {
  type: 'object',
  properties: {
    image: { type: 'string', minLength: 1 },
    command: { type: 'array', items: { type: 'string' } },
    entrypoint: { type: 'array', items: { type: 'string' } },
    environment: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    volumes: { type: 'array', items: { type: 'string' } },
    dns: {
      type: 'array',
      items: {
        anyOf: [
          { type: 'string', format: 'ipv4' },
          { type: 'string', format: 'ipv6' },
        ],
      },
    },
    restart: { enum: ['no', 'always', 'on-failure', 'unless-stopped'] },
    user: { type: 'string' },
    hostname: { type: 'string' },
    privileged: { type: 'boolean' },
    mem_limit: { type: 'string' },
    cpus: { type: 'number' },
    read_only: { type: 'boolean' },
    healthcheck: healthcheckSchema,
    ulimits: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          soft: { type: 'integer' },
          hard: { type: 'integer' },
        },
      },
      propertyNames: { enum: ['nofile', 'nproc', 'core'] },
    },
  },
  required: ['image'],
}

const dockerSchema: JsonSchema = {
  type: 'object',
  properties: {
    services: { type: 'object', additionalProperties: serviceSchema },
    volumes: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          driver: { type: 'string' },
          external: { type: 'boolean' },
        },
      },
    },
    networks: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          driver: { type: 'string' },
          internal: { type: 'boolean' },
        },
      },
    },
  },
  required: ['services'],
}

const dockerValue = {
  services: {
    web: {
      image: 'nginx',
      volumes: ['data:/var/www'],
      dns: ['1.1.1.1', '2606:4700:4700::1111'],
      healthcheck: null,
      ulimits: { nofile: { soft: 1024, hard: 2048 } },
    },
    db: { image: 'postgres' },
  },
  volumes: { data: { driver: 'local' } },
  networks: {},
}

function childByKey(node: TreeNode, key: string): TreeNode | undefined {
  return node.children.find(c => c.path[c.path.length - 1] === key)
}

describe('encodeNodeId / decodeNodeId', () => {
  it('encodes the root path as the empty string', () => {
    expect(encodeNodeId([])).toBe('')
    expect(decodeNodeId('')).toEqual([])
  })

  it('round-trips keys containing dots, slashes, and spaces', () => {
    const paths = [
      ['sysctls', 'net.ipv4.tcp_syncookies'],
      ['tmpfs', '/tmp'],
      ['services', 'my web app', 'image'],
    ]
    for (const path of paths) {
      expect(decodeNodeId(encodeNodeId(path))).toEqual(path)
    }
  })

  it('keeps dotted keys distinct from nested segments', () => {
    expect(encodeNodeId(['a.b'])).not.toBe(encodeNodeId(['a', 'b']))
  })
})

describe('classifyHeavy', () => {
  it('classifies records of objects as heavy', () => {
    expect(classifyHeavy(dockerSchema.properties!.services!)).toBe('record')
  })

  it('classifies records of scalars as inline', () => {
    expect(
      classifyHeavy({
        type: 'object',
        additionalProperties: { type: 'string' },
      })
    ).toBeNull()
  })

  it('classifies arrays of objects as heavy', () => {
    expect(
      classifyHeavy({
        type: 'array',
        items: { type: 'object', properties: { name: { type: 'string' } } },
      })
    ).toBe('array')
  })

  it('classifies arrays of anyOf string formats as inline', () => {
    expect(classifyHeavy(serviceSchema.properties!.dns!)).toBeNull()
  })

  it('classifies primitive arrays as inline', () => {
    expect(classifyHeavy(serviceSchema.properties!.volumes!)).toBeNull()
  })

  it('runs on the effective schema behind nullable wrappers', () => {
    expect(classifyHeavy(healthcheckSchema)).toBeNull()
    expect(
      classifyHeavy({
        anyOf: [
          { type: 'null' },
          { type: 'object', additionalProperties: serviceSchema },
        ],
      })
    ).toBe('record')
  })

  it('classifies fixed objects by the weight threshold', () => {
    expect(WEIGHT_THRESHOLD).toBe(12)
    expect(classifyHeavy(objectOfStrings(WEIGHT_THRESHOLD + 1))).toBe('object')
    expect(classifyHeavy(objectOfStrings(WEIGHT_THRESHOLD))).toBeNull()
  })
})

describe('deriveTree: docker-shaped schema', () => {
  const root = deriveTree(dockerSchema, dockerValue)

  it('returns a root node labeled Config with the empty id', () => {
    expect(root.path).toEqual([])
    expect(root.id).toBe('')
    expect(root.label).toBe('Config')
    expect(root.notConfigured).toBe(false)
  })

  it('lists the top-level records as children with entry counts', () => {
    expect(root.children.map(c => c.label)).toEqual([
      'services',
      'volumes',
      'networks',
    ])
    expect(childByKey(root, 'services')?.summary).toBe('2 entries')
    expect(childByKey(root, 'volumes')?.summary).toBe('1 entry')
    expect(childByKey(root, 'networks')?.summary).toBe('0 entries')
  })

  it('creates one entry node per record key, labeled by key', () => {
    const services = childByKey(root, 'services')!
    expect(services.children.map(c => c.label)).toEqual(['web', 'db'])
    expect(childByKey(services, 'web')?.path).toEqual(['services', 'web'])
    expect(childByKey(services, 'web')?.id).toBe(
      encodeNodeId(['services', 'web'])
    )
  })

  it('gives a service entry only its heavy children', () => {
    const web = childByKey(childByKey(root, 'services')!, 'web')!
    expect(web.children.map(c => c.path[c.path.length - 1])).toEqual([
      'ulimits',
    ])
    expect(childByKey(web, 'ulimits')?.summary).toBe('1 entry')
  })

  it('never creates nodes for healthcheck, volumes, or dns of a service', () => {
    const web = childByKey(childByKey(root, 'services')!, 'web')!
    expect(childByKey(web, 'healthcheck')).toBeUndefined()
    expect(childByKey(web, 'volumes')).toBeUndefined()
    expect(childByKey(web, 'dns')).toBeUndefined()
  })
})

describe('deriveTree: weight threshold on fixed objects', () => {
  it('creates a node for a 13-property object and none for a 12-property one', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        big: objectOfStrings(13),
        small: objectOfStrings(12),
      },
    }
    const root = deriveTree(schema, { big: {}, small: {} })
    expect(root.children.map(c => c.label)).toEqual(['big'])
  })
})

describe('deriveTree: arrays of objects', () => {
  const schema: JsonSchema = {
    type: 'object',
    properties: {
      containers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            image: { type: 'string' },
          },
        },
      },
    },
  }

  it('counts items and labels entries via getItemLabel', () => {
    const root = deriveTree(schema, {
      containers: [{ name: 'web' }, { image: 'redis' }],
    })
    const containers = childByKey(root, 'containers')!
    expect(containers.summary).toBe('2 items')
    expect(containers.children.map(c => c.label)).toEqual([
      'web',
      'containers 2',
    ])
    expect(containers.children[1]?.path).toEqual(['containers', '1'])
  })

  it('uses the singular form for a single item', () => {
    const root = deriveTree(schema, { containers: [{ name: 'web' }] })
    expect(childByKey(root, 'containers')?.summary).toBe('1 item')
  })
})

describe('deriveTree: nullable heavy containers', () => {
  const schema: JsonSchema = {
    type: 'object',
    properties: {
      pods: {
        anyOf: [
          { type: 'null' },
          {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: { image: { type: 'string' } },
            },
          },
        ],
      },
    },
  }

  it('keeps the node while null, marked not configured, with no children', () => {
    const root = deriveTree(schema, { pods: null })
    const pods = childByKey(root, 'pods')!
    expect(pods.notConfigured).toBe(true)
    expect(pods.summary).toBe('Not configured')
    expect(pods.children).toEqual([])
  })

  it('treats an absent value the same as null', () => {
    const root = deriveTree(schema, {})
    expect(childByKey(root, 'pods')?.notConfigured).toBe(true)
  })

  it('shows entries once configured', () => {
    const root = deriveTree(schema, { pods: { app: { image: 'nginx' } } })
    const pods = childByKey(root, 'pods')!
    expect(pods.notConfigured).toBe(false)
    expect(pods.summary).toBe('1 entry')
    expect(pods.children.map(c => c.label)).toEqual(['app'])
  })
})

describe('deriveTree: degenerate schemas', () => {
  it('returns only the root node when nothing is heavy', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        env: { type: 'object', additionalProperties: { type: 'string' } },
        small: objectOfStrings(3),
      },
    }
    const root = deriveTree(schema, { name: 'x', tags: [], env: {} })
    expect(root.children).toEqual([])
  })
})

describe('deriveTree: heavy containers under light objects', () => {
  it('hoists a nested heavy container to its nearest heavy ancestor', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        advanced: {
          type: 'object',
          properties: {
            verbose: { type: 'boolean' },
            hooks: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: { cmd: { type: 'string' } },
              },
            },
          },
        },
      },
    }
    const root = deriveTree(schema, {
      advanced: { verbose: true, hooks: { pre: { cmd: 'echo' } } },
    })
    expect(root.children).toHaveLength(1)
    const hooks = root.children[0]!
    expect(hooks.path).toEqual(['advanced', 'hooks'])
    expect(hooks.summary).toBe('1 entry')
    expect(hooks.children.map(c => c.label)).toEqual(['pre'])
  })
})

describe('remapPathForRename', () => {
  it('remaps deep descendant paths through the renamed key', () => {
    expect(
      remapPathForRename(
        ['services', 'web', 'ulimits', 'nofile'],
        ['services'],
        'web',
        'proxy'
      )
    ).toEqual(['services', 'proxy', 'ulimits', 'nofile'])
  })

  it('remaps the renamed node itself', () => {
    expect(
      remapPathForRename(['services', 'web'], ['services'], 'web', 'proxy')
    ).toEqual(['services', 'proxy'])
  })

  it('leaves paths outside the renamed entry untouched', () => {
    expect(
      remapPathForRename(['services', 'db'], ['services'], 'web', 'proxy')
    ).toEqual(['services', 'db'])
    expect(
      remapPathForRename(['volumes', 'web'], ['services'], 'web', 'proxy')
    ).toEqual(['volumes', 'web'])
    expect(remapPathForRename(['services'], ['services'], 'web', 'p')).toEqual([
      'services',
    ])
  })
})

describe('remapPathForArrayRemoval', () => {
  it('nulls paths under the removed index', () => {
    expect(
      remapPathForArrayRemoval(['containers', '1', 'name'], ['containers'], 1)
    ).toBeNull()
    expect(
      remapPathForArrayRemoval(['containers', '1'], ['containers'], 1)
    ).toBeNull()
  })

  it('shifts higher indexes down by one', () => {
    expect(
      remapPathForArrayRemoval(['containers', '2', 'name'], ['containers'], 1)
    ).toEqual(['containers', '1', 'name'])
  })

  it('leaves lower indexes and unrelated paths untouched', () => {
    expect(
      remapPathForArrayRemoval(['containers', '0'], ['containers'], 1)
    ).toEqual(['containers', '0'])
    expect(
      remapPathForArrayRemoval(['volumes', '2'], ['containers'], 1)
    ).toEqual(['volumes', '2'])
    expect(remapPathForArrayRemoval(['containers'], ['containers'], 0)).toEqual(
      ['containers']
    )
  })
})

describe('nearestSurvivingPath', () => {
  it('keeps a path that still resolves', () => {
    expect(
      nearestSurvivingPath(['services', 'web'], dockerSchema, dockerValue)
    ).toEqual(['services', 'web'])
  })

  it('falls back to the nearest ancestor when the entry was removed', () => {
    const withoutWeb = {
      ...dockerValue,
      services: { db: dockerValue.services.db },
    }
    expect(
      nearestSurvivingPath(
        ['services', 'web', 'ulimits'],
        dockerSchema,
        withoutWeb
      )
    ).toEqual(['services'])
  })

  it('walks to the root when nothing on the path resolves', () => {
    expect(
      nearestSurvivingPath(['bogus', 'deeper'], dockerSchema, dockerValue)
    ).toEqual([])
  })
})
