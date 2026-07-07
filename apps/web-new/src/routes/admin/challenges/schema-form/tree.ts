import type { JsonSchema } from './types'
import {
  arrayItemSchema,
  collectionSummary,
  fieldLabel,
  getEffectiveSchema,
  getItemLabel,
  getPrimaryType,
  isNullable,
  isRecordSchema,
  recordValueSchema,
  schemaAtPath,
  valueAtPath,
} from './utils'

export const WEIGHT_THRESHOLD = 12

const ID_SEPARATOR = '\u001f'

export type HeavyKind = 'record' | 'array' | 'object'

export interface TreeNode {
  path: string[]
  id: string
  label: string
  summary: string
  notConfigured: boolean
  children: TreeNode[]
}

export function encodeNodeId(path: string[]): string {
  return path.join(ID_SEPARATOR)
}

export function decodeNodeId(id: string): string[] {
  return id === '' ? [] : id.split(ID_SEPARATOR)
}

export function classifyHeavy(schema: JsonSchema): HeavyKind | null {
  const effective = getEffectiveSchema(schema)
  if (isRecordSchema(effective)) {
    const valueSchema = getEffectiveSchema(recordValueSchema(effective))
    return getPrimaryType(valueSchema) === 'object' ? 'record' : null
  }
  const primary = getPrimaryType(effective)
  if (primary === 'array') {
    const itemSchema = getEffectiveSchema(arrayItemSchema(effective))
    return getPrimaryType(itemSchema) === 'object' ? 'array' : null
  }
  if (primary === 'object' && effective.properties) {
    return Object.keys(effective.properties).length > WEIGHT_THRESHOLD
      ? 'object'
      : null
  }
  return null
}

export function deriveTree(schema: JsonSchema, value: unknown): TreeNode {
  return buildNode(schema, value, [], 'Config')
}

function buildNode(
  schema: JsonSchema,
  value: unknown,
  path: string[],
  label: string
): TreeNode {
  const notConfigured =
    isNullable(schema) && (value === null || value === undefined)
  return {
    path,
    id: encodeNodeId(path),
    label,
    summary: nodeSummary(schema, value, notConfigured),
    notConfigured,
    children: notConfigured ? [] : childNodes(schema, value, path),
  }
}

function nodeSummary(
  schema: JsonSchema,
  value: unknown,
  notConfigured: boolean
): string {
  if (notConfigured) return 'Not configured'
  return collectionSummary(getEffectiveSchema(schema), value) ?? ''
}

function childNodes(
  schema: JsonSchema,
  value: unknown,
  path: string[]
): TreeNode[] {
  const effective = getEffectiveSchema(schema)
  const kind = classifyHeavy(effective)
  if (kind === 'record') {
    const valueSchema = recordValueSchema(effective)
    const record =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {}
    return Object.entries(record).map(([key, entry]) =>
      buildNode(valueSchema, entry, [...path, key], key)
    )
  }
  if (kind === 'array') {
    const itemSchema = arrayItemSchema(effective)
    const items = Array.isArray(value) ? value : []
    const fallback = fieldLabel(effective, path, 'Items')
    return items.map((item, index) =>
      buildNode(
        itemSchema,
        item,
        [...path, String(index)],
        getItemLabel(item, index, fallback)
      )
    )
  }
  return heavyDescendants(effective, value, path)
}

function heavyDescendants(
  effective: JsonSchema,
  value: unknown,
  path: string[]
): TreeNode[] {
  if (getPrimaryType(effective) !== 'object' || !effective.properties) {
    return []
  }
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined
  const nodes: TreeNode[] = []
  for (const [key, childSchema] of Object.entries(effective.properties)) {
    const childPath = [...path, key]
    const childValue = record?.[key]
    const childEffective = getEffectiveSchema(childSchema)
    if (classifyHeavy(childEffective)) {
      nodes.push(
        buildNode(
          childSchema,
          childValue,
          childPath,
          fieldLabel(childEffective, childPath)
        )
      )
    } else if (
      getPrimaryType(childEffective) === 'object' &&
      childEffective.properties
    ) {
      nodes.push(...heavyDescendants(childEffective, childValue, childPath))
    }
  }
  return nodes
}

export function pathStartsWith(path: string[], prefix: string[]): boolean {
  return prefix.every((segment, i) => path[i] === segment)
}

export function remapPathForRename(
  path: string[],
  parentPath: string[],
  oldKey: string,
  newKey: string
): string[] {
  if (path.length <= parentPath.length) return path
  if (!pathStartsWith(path, parentPath)) return path
  if (path[parentPath.length] !== oldKey) return path
  const next = [...path]
  next[parentPath.length] = newKey
  return next
}

export function remapPathForArrayRemoval(
  path: string[],
  arrayPath: string[],
  removedIndex: number
): string[] | null {
  if (path.length <= arrayPath.length) return path
  if (!pathStartsWith(path, arrayPath)) return path
  const index = Number(path[arrayPath.length])
  if (!Number.isInteger(index)) return path
  if (index === removedIndex) return null
  if (index < removedIndex) return path
  const next = [...path]
  next[arrayPath.length] = String(index - 1)
  return next
}

export function nearestSurvivingPath(
  path: string[],
  schema: JsonSchema,
  value: unknown
): string[] {
  for (let length = path.length; length > 0; length--) {
    const candidate = path.slice(0, length)
    if (
      schemaAtPath(schema, candidate) !== null &&
      valueAtPath(value, candidate) !== undefined
    ) {
      return candidate
    }
  }
  return []
}
