import {
  deriveTree,
  encodeNodeId,
  type TreeNode,
} from '$routes/admin/challenges/schema-form/tree'
import type { JsonSchema } from '$routes/admin/challenges/schema-form/types'
import {
  pathStatuses,
  validateTree,
  type ValidationFinding,
} from '$routes/admin/challenges/schema-form/validate-tree'
import { describe, expect, it } from 'bun:test'

const healthcheckSchema: JsonSchema = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object',
      title: 'Healthcheck',
      properties: {
        test: { type: 'array', items: { type: 'string' }, minItems: 1 },
        interval: { type: 'string' },
        retries: { type: 'integer' },
      },
      required: ['test'],
    },
  ],
}

const serviceSchema: JsonSchema = {
  type: 'object',
  properties: {
    image: { type: 'string', minLength: 1 },
    restart: { enum: ['no', 'always', 'on-failure', 'unless-stopped'] },
    cpus: { type: 'number' },
    dns: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'string',
            format: 'ipv4',
            pattern: '^(?:\\d{1,3}\\.){3}\\d{1,3}$',
          },
          { type: 'string', format: 'ipv6', pattern: '^[0-9a-fA-F:]+$' },
        ],
      },
    },
    sysctls: {
      type: 'object',
      additionalProperties: { type: 'string', pattern: '^\\d+$' },
    },
    healthcheck: healthcheckSchema,
    ulimits: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          soft: { type: 'integer' },
          hard: { type: 'integer' },
        },
        required: ['soft', 'hard'],
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
  },
  required: ['services'],
}

type DockerConfig = {
  services: Record<string, Record<string, unknown>>
  volumes: Record<string, Record<string, unknown>>
}

function validConfig(): DockerConfig {
  return {
    services: {
      web: {
        image: 'nginx',
        restart: 'always',
        cpus: 0.5,
        dns: ['1.1.1.1', '2606:4700:4700::1111'],
        sysctls: { 'net.ipv4.ip_unprivileged_port_start': '0' },
        healthcheck: null,
        ulimits: { nofile: { soft: 1024, hard: 2048 } },
      },
      db: { image: 'postgres' },
    },
    volumes: { data: { driver: 'local' } },
  }
}

const rootId = encodeNodeId([])
const servicesId = encodeNodeId(['services'])
const webId = encodeNodeId(['services', 'web'])

function allFindings(
  findings: Map<string, ValidationFinding[]>
): ValidationFinding[] {
  return [...findings.values()].flat()
}

describe('validateTree: valid config', () => {
  it('returns an empty map for a fully valid config', () => {
    expect(validateTree(dockerSchema, validConfig()).size).toBe(0)
  })

  it('produces no statuses for an empty findings map', () => {
    expect(pathStatuses(new Map()).size).toBe(0)
  })
})

describe('validateTree: invalid leaf in an unselected subtree (AE2)', () => {
  it('attributes a bad enum value to the owning entry node', () => {
    const config = validConfig()
    config.services.web!.restart = 'sometimes'
    const findings = validateTree(dockerSchema, config)
    expect(findings.size).toBe(1)
    const list = findings.get(webId)!
    expect(list).toHaveLength(1)
    expect(list[0]?.severity).toBe('invalid')
    expect(list[0]?.fieldPath).toEqual(['services', 'web', 'restart'])
    expect(list[0]?.message).toBeString()
  })

  it('marks the node and every ancestor on the path', () => {
    const config = validConfig()
    config.services.web!.restart = 'sometimes'
    const statuses = pathStatuses(validateTree(dockerSchema, config))
    expect(statuses.get(webId)).toBe('invalid')
    expect(statuses.get(servicesId)).toBe('invalid')
    expect(statuses.get(rootId)).toBe('invalid')
  })

  it('clears everything when the value is fixed', () => {
    const config = validConfig()
    config.services.web!.restart = 'sometimes'
    expect(validateTree(dockerSchema, config).size).toBe(1)
    const fixed = validConfig()
    fixed.services.web!.restart = 'on-failure'
    const findings = validateTree(dockerSchema, fixed)
    expect(findings.size).toBe(0)
    expect(pathStatuses(findings).size).toBe(0)
  })
})

describe('validateTree: required-field presence', () => {
  it('flags a fresh entry with an empty required image as missing, not invalid', () => {
    const config = validConfig()
    config.services.fresh = { image: '' }
    const findings = validateTree(dockerSchema, config)
    const freshId = encodeNodeId(['services', 'fresh'])
    const list = findings.get(freshId)!
    expect(list).toHaveLength(1)
    expect(list[0]?.severity).toBe('missing')
    expect(list[0]?.fieldPath).toEqual(['services', 'fresh', 'image'])
    expect(allFindings(findings).every(f => f.severity === 'missing')).toBe(
      true
    )
    const statuses = pathStatuses(findings)
    expect(statuses.get(freshId)).toBe('incomplete')
    expect(statuses.get(servicesId)).toBe('incomplete')
    expect(statuses.get(rootId)).toBe('incomplete')
  })

  it('flags an absent required key as missing', () => {
    const config = validConfig()
    config.services.fresh = {}
    const findings = validateTree(dockerSchema, config)
    const list = findings.get(encodeNodeId(['services', 'fresh']))!
    expect(list[0]?.severity).toBe('missing')
    expect(list[0]?.fieldPath).toEqual(['services', 'fresh', 'image'])
  })

  it('accepts null for a required nullable key', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { check: healthcheckSchema },
      required: ['check'],
    }
    expect(validateTree(schema, { check: null }).size).toBe(0)
  })

  it('accepts null for a required oneOf-nullable key', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        value: { oneOf: [{ type: 'string' }, { type: 'null' }] },
      },
      required: ['value'],
    }
    expect(validateTree(schema, { value: null }).size).toBe(0)
  })

  it('flags null for a required non-nullable key as missing', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    }
    const findings = validateTree(schema, { name: null })
    expect(findings.get(rootId)?.[0]?.severity).toBe('missing')
  })
})

describe('validateTree: nullable containers (KTD-6)', () => {
  it('produces no findings beneath a null nullable healthcheck', () => {
    const config = validConfig()
    config.services.web!.healthcheck = null
    expect(validateTree(dockerSchema, config).size).toBe(0)
  })

  it('flags an enabled healthcheck with an empty required test array as missing', () => {
    const config = validConfig()
    config.services.web!.healthcheck = { test: [], interval: '' }
    const findings = validateTree(dockerSchema, config)
    const list = findings.get(webId)!
    expect(list).toHaveLength(1)
    expect(list[0]?.severity).toBe('missing')
    expect(list[0]?.fieldPath).toEqual([
      'services',
      'web',
      'healthcheck',
      'test',
    ])
    expect(pathStatuses(findings).get(webId)).toBe('incomplete')
  })

  it('validates an enabled healthcheck normally', () => {
    const config = validConfig()
    config.services.web!.healthcheck = {
      test: ['CMD', 'curl'],
      interval: '5s',
      retries: 2.5,
    }
    const findings = validateTree(dockerSchema, config)
    const list = findings.get(webId)!
    expect(list).toHaveLength(1)
    expect(list[0]?.severity).toBe('invalid')
    expect(list[0]?.fieldPath).toEqual([
      'services',
      'web',
      'healthcheck',
      'retries',
    ])
  })
})

describe('validateTree: record keys containing dots', () => {
  it('attributes scalar-record findings to the owning node with the exact key', () => {
    const config = validConfig()
    config.services.web!.sysctls = {
      'net.ipv4.ip_unprivileged_port_start': 'abc',
    }
    const findings = validateTree(dockerSchema, config)
    const list = findings.get(webId)!
    expect(list).toHaveLength(1)
    expect(list[0]?.severity).toBe('invalid')
    expect(list[0]?.fieldPath).toEqual([
      'services',
      'web',
      'sysctls',
      'net.ipv4.ip_unprivileged_port_start',
    ])
    const statuses = pathStatuses(findings)
    expect(statuses.has(encodeNodeId(['services', 'web', 'sysctls']))).toBe(
      false
    )
  })

  it('attributes heavy-record entry findings without prefix collisions', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        rules: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: { value: { type: 'integer' } },
            required: ['value'],
          },
        },
      },
    }
    const dottedKey = 'net.ipv4.ip_unprivileged_port_start'
    const findings = validateTree(schema, {
      rules: { [dottedKey]: { value: 'high' } },
    })
    const entryId = encodeNodeId(['rules', dottedKey])
    expect(findings.get(entryId)?.[0]?.severity).toBe('invalid')
    const statuses = pathStatuses(findings)
    expect(statuses.get(entryId)).toBe('invalid')
    expect(statuses.get(encodeNodeId(['rules']))).toBe('invalid')
    expect(statuses.get(rootId)).toBe('invalid')
    expect(statuses.has(encodeNodeId(['rules', 'net']))).toBe(false)
    expect(statuses.has(encodeNodeId(['rules', 'net', 'ipv4']))).toBe(false)
  })
})

describe('validateTree: dns anyOf format branches', () => {
  it('accepts valid ipv4 and ipv6 entries without throwing', () => {
    expect(validateTree(dockerSchema, validConfig()).size).toBe(0)
  })

  it('flags a bad dns entry as invalid', () => {
    const config = validConfig()
    config.services.web!.dns = ['1.1.1.1', 'not-an-ip']
    const findings = validateTree(dockerSchema, config)
    const list = findings.get(webId)!
    expect(list).toHaveLength(1)
    expect(list[0]?.severity).toBe('invalid')
    expect(list[0]?.fieldPath).toEqual(['services', 'web', 'dns', '1'])
  })
})

describe('validateTree: type mismatches', () => {
  it('flags null for an optional non-nullable scalar', () => {
    const config = validConfig()
    config.services.web!.cpus = null
    const findings = validateTree(dockerSchema, config)
    const finding = findings.get(webId)?.[0]
    expect(finding?.severity).toBe('invalid')
    expect(finding?.message).toBe('Must not be null')
    expect(finding?.fieldPath).toEqual(['services', 'web', 'cpus'])
  })

  it('flags null for a non-nullable array item', () => {
    const config = validConfig()
    config.services.web!.dns = ['1.1.1.1', null]
    const findings = validateTree(dockerSchema, config)
    const finding = findings.get(webId)?.[0]
    expect(finding?.severity).toBe('invalid')
    expect(finding?.fieldPath).toEqual(['services', 'web', 'dns', '1'])
  })

  it('flags a string sitting under a number schema', () => {
    const config = validConfig()
    config.services.web!.cpus = 'two'
    const findings = validateTree(dockerSchema, config)
    const list = findings.get(webId)!
    expect(list).toHaveLength(1)
    expect(list[0]?.severity).toBe('invalid')
    expect(list[0]?.fieldPath).toEqual(['services', 'web', 'cpus'])
  })

  it('flags a string sitting under an integer schema inside a heavy record entry', () => {
    const config = validConfig()
    config.services.web!.ulimits = { nofile: { soft: '1024', hard: 2048 } }
    const findings = validateTree(dockerSchema, config)
    const nofileId = encodeNodeId(['services', 'web', 'ulimits', 'nofile'])
    const list = findings.get(nofileId)!
    expect(list).toHaveLength(1)
    expect(list[0]?.severity).toBe('invalid')
    expect(list[0]?.fieldPath).toEqual([
      'services',
      'web',
      'ulimits',
      'nofile',
      'soft',
    ])
    expect(pathStatuses(findings).get(webId)).toBe('invalid')
  })

  it('flags a non-object sitting where a record is expected', () => {
    const config = validConfig() as Record<string, unknown>
    config.services = 'oops'
    const findings = validateTree(dockerSchema, config)
    const list = findings.get(servicesId)!
    expect(list).toHaveLength(1)
    expect(list[0]?.severity).toBe('invalid')
    expect(list[0]?.fieldPath).toEqual(['services'])
  })
})

describe('validateTree: unknown value keys', () => {
  it('ignores keys present in the value but absent from the schema', () => {
    const config = validConfig() as Record<string, unknown>
    config.extras = { anything: true }
    const web = (config.services as Record<string, Record<string, unknown>>)
      .web!
    web.unknownKey = 123
    expect(validateTree(dockerSchema, config).size).toBe(0)
  })
})

describe('pathStatuses: severity aggregation', () => {
  it('lets invalid win over incomplete on a single node', () => {
    const config = validConfig()
    config.services.fresh = { image: '', restart: 'bogus' }
    const findings = validateTree(dockerSchema, config)
    const freshId = encodeNodeId(['services', 'fresh'])
    expect(findings.get(freshId)).toHaveLength(2)
    const statuses = pathStatuses(findings)
    expect(statuses.get(freshId)).toBe('invalid')
    expect(statuses.get(servicesId)).toBe('invalid')
    expect(statuses.get(rootId)).toBe('invalid')
  })

  it('lets invalid win over incomplete on shared ancestors', () => {
    const config = validConfig()
    config.services.fresh = { image: '' }
    config.services.web!.restart = 'bogus'
    const statuses = pathStatuses(validateTree(dockerSchema, config))
    expect(statuses.get(encodeNodeId(['services', 'fresh']))).toBe('incomplete')
    expect(statuses.get(webId)).toBe('invalid')
    expect(statuses.get(servicesId)).toBe('invalid')
    expect(statuses.get(rootId)).toBe('invalid')
  })
})

describe('validateTree: array/object type-mismatch guards', () => {
  it('flags a scalar where an array is expected', () => {
    const config = validConfig()
    config.services.web!.dns = 'not-a-list'
    const findings = validateTree(dockerSchema, config)
    const finding = allFindings(findings).find(
      f => f.message === 'Must be an array'
    )
    expect(finding?.fieldPath).toEqual(['services', 'web', 'dns'])
    expect(
      findings.get(webId)?.some(f => f.message === 'Must be an array')
    ).toBe(true)
  })

  it('flags a scalar where an object is expected', () => {
    const config = validConfig()
    config.services.web!.healthcheck = 'yes'
    const findings = validateTree(dockerSchema, config)
    const finding = allFindings(findings).find(
      f => f.message === 'Must be an object'
    )
    expect(finding?.fieldPath).toEqual(['services', 'web', 'healthcheck'])
    expect(
      findings.get(webId)?.some(f => f.message === 'Must be an object')
    ).toBe(true)
  })
})

describe('pathStatuses: ancestor upgrade ordering', () => {
  it('upgrades incomplete-marked ancestors when a later finding is invalid', () => {
    const config = validConfig()
    // Insertion order puts the incomplete entry first so its ancestor chain is
    // marked before the invalid propagation must overwrite and keep climbing.
    config.services = { fresh: { image: '' }, ...config.services }
    config.services.web!.restart = 'bogus'
    const statuses = pathStatuses(validateTree(dockerSchema, config))
    expect(statuses.get(encodeNodeId(['services', 'fresh']))).toBe('incomplete')
    expect(statuses.get(encodeNodeId(['services', 'web']))).toBe('invalid')
    expect(statuses.get(servicesId)).toBe('invalid')
    expect(statuses.get(rootId)).toBe('invalid')
  })
})

describe('validateTree: owning-node attribution invariant', () => {
  it('keys every finding to a node deriveTree creates for the same inputs', () => {
    const config = validConfig()
    config.services = { fresh: { image: '' }, ...config.services }
    config.services.web!.restart = 'bogus'
    config.services.web!.dns = ['1.1.1.1', 'not-an-ip']
    config.services.web!.sysctls = { 'net.core.somaxconn': 'NaN' }
    config.services.db!.ulimits = { nofile: { soft: 'low', hard: 2048 } }
    config.volumes.data!.driver = 7 as unknown as string

    const nodeIds = new Set<string>()
    const visit = (node: TreeNode) => {
      nodeIds.add(node.id)
      for (const child of node.children) visit(child)
    }
    visit(deriveTree(dockerSchema, config))

    const findings = validateTree(dockerSchema, config)
    expect(findings.size).toBeGreaterThan(0)
    for (const owningId of findings.keys()) {
      expect(nodeIds.has(owningId)).toBe(true)
    }
  })
})
