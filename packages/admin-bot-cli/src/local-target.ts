import { readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import {
  RegExpParser,
  visitRegExpAST,
  type AST,
} from '@eslint-community/regexpp'
import { parse } from 'yaml'
import type { RegexRule } from '../../../apps/admin-bot/src/core/pac'
import { runCommand } from './command'

const COMPOSE_FILENAMES = [
  'compose.yml',
  'compose.yaml',
  'docker-compose.yml',
  'docker-compose.yaml',
] as const

export interface LocalTarget {
  url: string
  service?: string
  containerPort?: number
}

interface UrlOriginRange {
  start: number
  separatorStart: number
  authorityStart: number
  end: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const parsePortNumber = (value: unknown): number | undefined => {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : undefined
}

const connectableHost = (host: string | undefined): string => {
  if (!host || host === '0.0.0.0' || host === '::') {
    return 'localhost'
  }
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
}

export const normalizeLocalTarget = (value: string): LocalTarget => {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Local target must use http:// or https://')
  }
  url.hash = ''
  return { url: url.href }
}

const composeTargets = (document: unknown): LocalTarget[] => {
  if (!isRecord(document) || !isRecord(document.services)) {
    return []
  }

  const targets: LocalTarget[] = []
  for (const [service, definition] of Object.entries(document.services)) {
    if (!isRecord(definition) || !Array.isArray(definition.ports)) {
      continue
    }
    for (const value of definition.ports) {
      if (
        !isRecord(value) ||
        (value.protocol !== undefined && value.protocol !== 'tcp')
      ) {
        continue
      }
      const published = parsePortNumber(value.published)
      if (!published) {
        continue
      }
      const host = connectableHost(
        typeof value.host_ip === 'string' ? value.host_ip : undefined
      )
      const formattedHost = host.includes(':') ? `[${host}]` : host
      targets.push({
        url: `http://${formattedHost}:${published}/`,
        service,
        containerPort: parsePortNumber(value.target),
      })
    }
  }
  return targets
}

interface ComposeCommand {
  command: string
  arguments: string[]
}

type ComposeErrorReporter = (message: string) => void
type ComposeConfigReader = (
  directory: string,
  reportError?: ComposeErrorReporter
) => Promise<unknown | undefined>

export interface DiscoverLocalTargetsOptions {
  cwd?: string
  readConfig?: ComposeConfigReader
  reportComposeError?: ComposeErrorReporter
}

const COMPOSE_COMMANDS: ComposeCommand[] = [
  { command: 'docker', arguments: ['compose'] },
  { command: 'docker-compose', arguments: [] },
]

let composeCommand: Promise<ComposeCommand | undefined> | undefined

const findComposeCommand = (): Promise<ComposeCommand | undefined> => {
  composeCommand ??= (async () => {
    for (const candidate of COMPOSE_COMMANDS) {
      try {
        const result = await runCommand(candidate.command, [
          ...candidate.arguments,
          'version',
        ])
        if (result.exitCode === 0) {
          return candidate
        }
      } catch {
        // Try the other supported Compose command.
      }
    }
    return undefined
  })()
  return composeCommand
}

const readComposeConfig = async (
  directory: string,
  reportError?: ComposeErrorReporter
): Promise<unknown | undefined> => {
  const compose = await findComposeCommand()
  if (!compose) {
    return undefined
  }

  try {
    const result = await runCommand(
      compose.command,
      [...compose.arguments, 'config'],
      { captureStdout: true, cwd: directory }
    )
    if (result.exitCode !== 0) {
      reportError?.(
        `Docker Compose config failed in ${directory}:\n${result.stderr || `Exited with code ${result.exitCode}`}`
      )
      return undefined
    }
    try {
      return parse(result.stdout)
    } catch (error) {
      reportError?.(
        `Could not parse Docker Compose config in ${directory}:\n${error instanceof Error ? error.message : String(error)}`
      )
      return undefined
    }
  } catch (error) {
    reportError?.(
      `Could not run Docker Compose config in ${directory}:\n${error instanceof Error ? error.message : String(error)}`
    )
    return undefined
  }
}

const isComposeFilename = (filename: string): boolean =>
  COMPOSE_FILENAMES.some(candidate => candidate === filename)

const composeDirectories = async (root: string): Promise<string[]> => {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return []
  }

  const directories = entries.some(
    entry => entry.isFile() && isComposeFilename(entry.name)
  )
    ? [root]
    : []
  const children = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()

  for (const child of children) {
    const directory = join(root, child)
    try {
      const childEntries = await readdir(directory, { withFileTypes: true })
      if (
        childEntries.some(
          entry => entry.isFile() && isComposeFilename(entry.name)
        )
      ) {
        directories.push(directory)
      }
    } catch {
      // Ignore subdirectories that cannot be read.
    }
  }
  return directories
}

export const discoverLocalTargets = async (
  configPath: string,
  options: DiscoverLocalTargetsOptions = {}
): Promise<LocalTarget[]> => {
  const cwd = options.cwd ?? process.cwd()
  const readConfig = options.readConfig ?? readComposeConfig
  const roots = [...new Set([dirname(resolve(configPath)), resolve(cwd)])]
  const seen = new Set<string>()
  const targets: LocalTarget[] = []
  for (const root of roots) {
    for (const directory of await composeDirectories(root)) {
      if (!seen.has(directory)) {
        seen.add(directory)
        targets.push(
          ...composeTargets(
            await readConfig(directory, options.reportComposeError)
          )
        )
      }
    }
  }
  return targets
}

// Convert input URL regexes to support arbitrary origin locally
const regexParser = new RegExpParser()
const URL_DELIMITER_CHARACTERS = ['/', '?', '#', '\\']
const URL_DELIMITERS = new Set(
  URL_DELIMITER_CHARACTERS.map(character => character.codePointAt(0)!)
)
const ANY_ORIGIN = '[^\\/?#\\\\]+'

const isCharacter = (
  element: AST.Element | AST.QuantifiableElement,
  expected: string
): boolean =>
  element.type === 'Character' &&
  String.fromCodePoint(element.value).toLowerCase() === expected

const matchesOptionalS = (element: AST.Element): boolean =>
  element.type === 'Quantifier' &&
  element.min === 0 &&
  element.max === 1 &&
  isCharacter(element.element, 's')

const startsWithUrlDelimiter = (
  element: AST.Element | AST.QuantifiableElement
): boolean => {
  if (element.type === 'Character') {
    return URL_DELIMITERS.has(element.value)
  }
  if (element.type === 'CharacterClass' && !element.negate) {
    return (
      element.elements.length > 0 &&
      element.elements.every(
        child => child.type === 'Character' && URL_DELIMITERS.has(child.value)
      )
    )
  }
  if (element.type === 'Quantifier') {
    return startsWithUrlDelimiter(element.element)
  }
  if (
    element.type !== 'Group' &&
    element.type !== 'CapturingGroup' &&
    !(element.type === 'Assertion' && element.kind === 'lookahead')
  ) {
    return false
  }

  let hasDelimiter = false
  for (const alternative of element.alternatives) {
    const first = alternative.elements[0]
    if (!first) {
      continue
    }
    if (!startsWithUrlDelimiter(first)) {
      return false
    }
    hasDelimiter = true
  }
  return hasDelimiter
}

const containsExplicitUrlDelimiter = (
  element: AST.Element,
  flags?: string
): boolean => {
  let result = false
  const syntaxFlags = flags?.replaceAll(/[dgy]/g, '')
  const matchesDelimiter = (raw: string): boolean => {
    try {
      const expression = new RegExp(`^(?:${raw})$`, syntaxFlags)
      return URL_DELIMITER_CHARACTERS.some(value => expression.test(value))
    } catch {
      return true
    }
  }

  visitRegExpAST(element, {
    onCharacterEnter: character => {
      if (
        (character.parent.type === 'Alternative' ||
          character.parent.type === 'Quantifier') &&
        URL_DELIMITERS.has(character.value)
      ) {
        result = true
      }
    },
    onCharacterClassEnter: characterClass => {
      if (!characterClass.negate && matchesDelimiter(characterClass.raw)) {
        result = true
      }
    },
    onExpressionCharacterClassEnter: characterClass => {
      if (!characterClass.negate && matchesDelimiter(characterClass.raw)) {
        result = true
      }
    },
  })
  return result
}

const isUnrestrictedSuffix = (elements: AST.Element[]): boolean => {
  const consuming = elements.filter(
    element => element.type !== 'Assertion' || element.kind !== 'end'
  )
  const [element] = consuming
  return (
    consuming.length === 1 &&
    element?.type === 'Quantifier' &&
    element.min === 0 &&
    element.max === Infinity &&
    element.element.type === 'CharacterSet' &&
    element.element.kind === 'any'
  )
}

const findUrlOrigin = (
  alternative: AST.Alternative,
  flags?: string
): UrlOriginRange | undefined => {
  const { elements } = alternative
  let index =
    elements[0]?.type === 'Assertion' && elements[0].kind === 'start' ? 1 : 0
  const start = elements[index]?.start
  if (start === undefined) {
    return undefined
  }

  for (const character of ['h', 't', 't', 'p']) {
    const element = elements[index]
    if (!element || !isCharacter(element, character)) {
      return undefined
    }
    index++
  }
  const secure = elements[index]
  if (secure && isCharacter(secure, 's')) {
    index++
  } else if (secure && matchesOptionalS(secure)) {
    index++
  }

  const separatorStart = elements[index]?.start
  if (separatorStart === undefined) {
    return undefined
  }
  for (const character of [':', '/', '/']) {
    const element = elements[index]
    if (!element || !isCharacter(element, character)) {
      return undefined
    }
    index++
  }
  const authorityStart = elements[index - 1]?.end
  if (authorityStart === undefined) {
    return undefined
  }
  const authorityElements = elements.slice(index)

  // `https?://.*` already has no path restriction. Keep the wildcard as the
  // suffix while still requiring a non-empty, syntactically bounded origin.
  if (isUnrestrictedSuffix(authorityElements)) {
    const [suffix] = authorityElements
    if (!suffix) {
      return undefined
    }
    return {
      start,
      separatorStart,
      authorityStart,
      end: suffix.start,
    }
  }

  let hasAuthority = false
  for (const element of authorityElements) {
    if (element.type === 'Assertion' && element.kind === 'end') {
      return hasAuthority
        ? { start, separatorStart, authorityStart, end: element.start }
        : undefined
    }
    if (startsWithUrlDelimiter(element)) {
      return hasAuthority
        ? { start, separatorStart, authorityStart, end: element.start }
        : undefined
    }
    if (containsExplicitUrlDelimiter(element, flags)) {
      return undefined
    }
    if (element.type !== 'Assertion') {
      hasAuthority = true
    }
  }

  return hasAuthority
    ? { start, separatorStart, authorityStart, end: alternative.end }
    : undefined
}

const findUrlOrigins = (
  pattern: AST.Pattern,
  flags?: string
): UrlOriginRange[] | undefined => {
  const findInAlternative = (
    alternative: AST.Alternative
  ): UrlOriginRange[] | undefined => {
    const origin = findUrlOrigin(alternative, flags)
    if (origin) {
      return [origin]
    }

    const elements = alternative.elements
    const index =
      elements[0]?.type === 'Assertion' && elements[0].kind === 'start' ? 1 : 0
    const first = elements[index]
    if (first?.type !== 'Group' && first?.type !== 'CapturingGroup') {
      return undefined
    }

    const next = elements[index + 1]
    if (
      next &&
      !(next.type === 'Assertion' && next.kind === 'end') &&
      !startsWithUrlDelimiter(next)
    ) {
      return undefined
    }

    const origins: UrlOriginRange[] = []
    for (const nestedAlternative of first.alternatives) {
      const nested = findInAlternative(nestedAlternative)
      if (!nested) {
        return undefined
      }
      origins.push(...nested)
    }
    return origins
  }

  const origins: UrlOriginRange[] = []
  for (const alternative of pattern.alternatives) {
    const nested = findInAlternative(alternative)
    if (!nested) {
      return undefined
    }
    origins.push(...nested)
  }
  return origins
}

export const localizePublicUrlRule = (rule: RegexRule): RegexRule => {
  let ast: AST.Pattern
  try {
    new RegExp(rule.pattern, rule.flags)
    ast = regexParser.parsePattern(rule.pattern, 0, rule.pattern.length, {
      unicode: rule.flags?.includes('u'),
      unicodeSets: rule.flags?.includes('v'),
    })
  } catch {
    return rule
  }

  const origins = findUrlOrigins(ast, rule.flags)
  if (!origins?.length) {
    return rule
  }

  const isRemoved = (node: AST.Node): boolean =>
    origins.some(origin => node.start >= origin.start && node.end <= origin.end)
  const removedCaptureCounts = new Map<UrlOriginRange, number>()
  let referencedOriginCapture = false
  let hasSurvivingNumericBackreference = false
  visitRegExpAST(ast, {
    onBackreferenceEnter: reference => {
      if (!isRemoved(reference) && typeof reference.ref === 'number') {
        hasSurvivingNumericBackreference = true
      }
    },
    onCapturingGroupEnter: capture => {
      const origin = origins.find(
        candidate =>
          capture.start >= candidate.start && capture.end <= candidate.end
      )
      if (origin) {
        removedCaptureCounts.set(
          origin,
          (removedCaptureCounts.get(origin) ?? 0) + 1
        )
        if (capture.references.some(reference => !isRemoved(reference))) {
          referencedOriginCapture = true
        }
      }
    },
  })
  // A path backreference to an origin capture cannot retain its meaning once
  // that origin is made arbitrary.
  if (referencedOriginCapture) {
    return rule
  }

  let pattern = rule.pattern
  for (const origin of origins.sort((a, b) => b.start - a.start)) {
    const separators = rule.pattern.slice(
      origin.separatorStart,
      origin.authorityStart
    )
    const captureSlots = hasSurvivingNumericBackreference
      ? '()'.repeat(removedCaptureCounts.get(origin) ?? 0)
      : ''
    pattern = `${pattern.slice(0, origin.start)}https?${separators}${ANY_ORIGIN}${captureSlots}${pattern.slice(origin.end)}`
  }
  try {
    new RegExp(pattern, rule.flags)
  } catch {
    return rule
  }

  return {
    ...rule,
    pattern,
  }
}

export const localTargetToInstance = (target: LocalTarget) => {
  const url = new URL(target.url)
  const https = url.protocol === 'https:'
  return {
    type: https ? 'https' : 'http',
    host: url.hostname,
    port: parsePortNumber(url.port) ?? (https ? 443 : 80),
    ...(target.service ? { title: target.service } : {}),
  }
}
