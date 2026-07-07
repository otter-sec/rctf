import { classifyHeavy, decodeNodeId, encodeNodeId } from './tree'
import type { JsonSchema } from './types'
import {
  getEffectiveSchema,
  getPrimaryType,
  isNullable,
  isRecordSchema,
  recordValueSchema,
} from './utils'
import { validateValue } from './validate'

export type FindingSeverity = 'missing' | 'invalid'

export interface ValidationFinding {
  severity: FindingSeverity
  message: string
  fieldPath: string[]
}

export type PathStatus = 'invalid' | 'incomplete'

type Findings = Map<string, ValidationFinding[]>

export function validateTree(schema: JsonSchema, value: unknown): Findings {
  const findings: Findings = new Map()
  walk(schema, value, [], [], findings)
  return findings
}

export function pathStatuses(findings: Findings): Map<string, PathStatus> {
  const statuses = new Map<string, PathStatus>()
  for (const [nodeId, nodeFindings] of findings) {
    if (nodeFindings.length === 0) continue
    const status: PathStatus = nodeFindings.some(f => f.severity === 'invalid')
      ? 'invalid'
      : 'incomplete'
    const path = decodeNodeId(nodeId)
    for (let length = path.length; length >= 0; length--) {
      const id = encodeNodeId(path.slice(0, length))
      if (status === 'invalid' || !statuses.has(id)) {
        statuses.set(id, status)
      }
    }
  }
  return statuses
}

function addFinding(
  findings: Findings,
  owningPath: string[],
  finding: ValidationFinding
): void {
  const id = encodeNodeId(owningPath)
  const list = findings.get(id)
  if (list) {
    list.push(finding)
  } else {
    findings.set(id, [finding])
  }
}

function addTypeMismatch(
  findings: Findings,
  owningPath: string[],
  fieldPath: string[],
  expected: 'object' | 'array'
): void {
  addFinding(findings, owningPath, {
    severity: 'invalid',
    message: expected === 'object' ? 'Must be an object' : 'Must be an array',
    fieldPath,
  })
}

function walk(
  schema: JsonSchema,
  value: unknown,
  fieldPath: string[],
  owningPath: string[],
  findings: Findings
): void {
  if (value === undefined || value === null) return
  const effective = getEffectiveSchema(schema)
  if (isRecordSchema(effective)) {
    walkRecord(effective, value, fieldPath, owningPath, findings)
    return
  }
  const primary = getPrimaryType(effective)
  if (primary === 'array') {
    walkArray(effective, value, fieldPath, owningPath, findings)
    return
  }
  if (primary === 'object' && effective.properties) {
    walkObject(effective, value, fieldPath, owningPath, findings)
    return
  }
  const result = validateValue(schema, value)
  if (!result.valid) {
    addFinding(findings, owningPath, {
      severity: 'invalid',
      message: result.error ?? 'Invalid value',
      fieldPath,
    })
  }
}

function walkRecord(
  effective: JsonSchema,
  value: unknown,
  fieldPath: string[],
  owningPath: string[],
  findings: Findings
): void {
  if (typeof value !== 'object' || Array.isArray(value)) {
    addTypeMismatch(findings, owningPath, fieldPath, 'object')
    return
  }
  const valueSchema = recordValueSchema(effective)
  const heavy = classifyHeavy(effective) === 'record'
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const entryPath = [...fieldPath, key]
    walk(
      valueSchema,
      entry,
      entryPath,
      heavy ? entryPath : owningPath,
      findings
    )
  }
}

function walkArray(
  effective: JsonSchema,
  value: unknown,
  fieldPath: string[],
  owningPath: string[],
  findings: Findings
): void {
  if (!Array.isArray(value)) {
    addTypeMismatch(findings, owningPath, fieldPath, 'array')
    return
  }
  const itemSchema = effective.items ?? ({ type: 'string' } as JsonSchema)
  const heavy = classifyHeavy(effective) === 'array'
  value.forEach((item, index) => {
    const itemPath = [...fieldPath, String(index)]
    walk(itemSchema, item, itemPath, heavy ? itemPath : owningPath, findings)
  })
}

function walkObject(
  effective: JsonSchema,
  value: unknown,
  fieldPath: string[],
  owningPath: string[],
  findings: Findings
): void {
  if (typeof value !== 'object' || Array.isArray(value)) {
    addTypeMismatch(findings, owningPath, fieldPath, 'object')
    return
  }
  const record = value as Record<string, unknown>
  const flaggedMissing = new Set<string>()
  for (const key of effective.required ?? []) {
    const childSchema = effective.properties?.[key]
    if (isMissingRequired(childSchema, record[key])) {
      flaggedMissing.add(key)
      addFinding(findings, owningPath, {
        severity: 'missing',
        message: 'Required',
        fieldPath: [...fieldPath, key],
      })
    }
  }
  for (const [key, childSchema] of Object.entries(effective.properties ?? {})) {
    if (flaggedMissing.has(key)) continue
    const childPath = [...fieldPath, key]
    const childOwning = classifyHeavy(childSchema) ? childPath : owningPath
    walk(childSchema, record[key], childPath, childOwning, findings)
  }
}

function isMissingRequired(
  schema: JsonSchema | undefined,
  value: unknown
): boolean {
  if (value === undefined) return true
  if (value === null) return !schema || !isNullable(schema)
  if (value === '') return true
  return Array.isArray(value) && value.length === 0
}
