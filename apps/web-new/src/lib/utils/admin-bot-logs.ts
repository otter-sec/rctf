import { isRecord } from '$lib/utils/is-record'

export type AdminBotLogLevel = 'info' | 'warn' | 'error' | 'fatal'

export type AdminBotLogEntry = {
  time: number
  level: AdminBotLogLevel
  prefix: string
  line: string
  extra: Record<string, unknown>
}

const LOG_LEVELS: readonly AdminBotLogLevel[] = [
  'info',
  'warn',
  'error',
  'fatal',
]

function isLogLevel(value: unknown): value is AdminBotLogLevel {
  return (
    typeof value === 'string' && LOG_LEVELS.includes(value as AdminBotLogLevel)
  )
}

function toEntry(parsed: Record<string, unknown>): AdminBotLogEntry {
  return {
    time: typeof parsed.time === 'number' ? parsed.time : 0,
    level: isLogLevel(parsed.level) ? parsed.level : 'info',
    prefix: typeof parsed.prefix === 'string' ? parsed.prefix : '',
    line: typeof parsed.line === 'string' ? parsed.line : '',
    extra: isRecord(parsed.extra) ? parsed.extra : {},
  }
}

export function parseAdminBotLogs(jsonl: string): AdminBotLogEntry[] {
  const entries: AdminBotLogEntry[] = []
  for (const raw of jsonl.split('\n')) {
    if (!raw.trim()) {
      continue
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue
    }
    if (isRecord(parsed)) {
      entries.push(toEntry(parsed))
    }
  }
  return entries
}

export function validateAdminBotInput(
  value: string,
  rule: { pattern: string; flags?: string }
): { valid: boolean; error?: string } {
  if (!value.trim()) {
    return { valid: false, error: 'This field is required.' }
  }
  let regex: RegExp
  try {
    regex = new RegExp(rule.pattern, rule.flags)
  } catch {
    return { valid: true }
  }
  if (!regex.test(value)) {
    return {
      valid: false,
      error: `Does not match the required format (${rule.pattern}).`,
    }
  }
  return { valid: true }
}
