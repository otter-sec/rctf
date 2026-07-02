// Admin-bot job logs arrive as JSONL: one JSON object per line, emitted by the
// admin-bot worker's OutputHandler ({ time, level, prefix, line, extra }). This
// module turns that text into render-ready entries and validates the per-input
// regex rules a challenge declares — both pure so the panel stays presentational.

export type AdminBotLogLevel = 'info' | 'warn' | 'error' | 'fatal'

/** One parsed admin-bot log line, normalized to always carry every field. */
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toEntry(parsed: Record<string, unknown>): AdminBotLogEntry {
  return {
    time: typeof parsed.time === 'number' ? parsed.time : 0,
    level: isLogLevel(parsed.level) ? parsed.level : 'info',
    prefix: typeof parsed.prefix === 'string' ? parsed.prefix : '',
    line: typeof parsed.line === 'string' ? parsed.line : '',
    extra: isPlainRecord(parsed.extra) ? parsed.extra : {},
  }
}

/**
 * Parses admin-bot JSONL into normalized entries.
 *
 * Blank lines are ignored; a line that is not valid JSON, or is JSON but not an
 * object, is skipped (mirroring the old client). A line that parses to an object
 * is kept, with any missing or wrongly-typed field filled with a safe default so
 * the viewer never has to guard against holes.
 *
 * @param jsonl - Raw newline-delimited job logs.
 */
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
    if (isPlainRecord(parsed)) {
      entries.push(toEntry(parsed))
    }
  }
  return entries
}

/**
 * Validates one admin-bot input value against its server-declared regex rule.
 *
 * A blank value fails as required. An otherwise non-empty value must match
 * `new RegExp(rule.pattern, rule.flags)`. If the server sends a pattern the
 * RegExp constructor rejects, validation is skipped and the value is accepted,
 * matching the old client — the server revalidates on submit regardless.
 *
 * @param value - The current input value.
 * @param rule - The regex rule ({ pattern, flags? }) for this input.
 */
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
