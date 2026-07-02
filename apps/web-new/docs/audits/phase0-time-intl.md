# Audit: `time.ts` elegance + modern Intl

Scope: `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/utils/time.ts` (95 lines, 8 exports) and `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/components/markdown-timer.svelte`. In web-new, `time.ts` currently has **zero importers**; the real call sites are in the old app (podium/solves lists, graph axes+tooltips, admin tables, instancer countdown, navigation-countdown) and arrive in later phases — so the export surface is right-sized, not dead code.

## Findings

- [SIMPLIFICATION] `src/lib/utils/time.ts:59-68` — `formatLocalTime` is half-Intl, half hand-rolled: it uses Intl only for the month name, then reimplements 12-hour clock math (`getHours() % 12 || 12`, manual padding, manual AM/PM) that Intl produces natively; reassembling from `formatToParts` gives byte-identical output with all values delegated to Intl.
  - evidence: MDN `Intl.DateTimeFormat.prototype.formatToParts` (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts) — Baseline Widely available since Oct 2018; explicitly recommended for reassembling formatted output with custom literals instead of parsing/rebuilding `format()` strings. Component options (`month`, `day`, `hour`, `minute`, `hourCycle`) are Baseline Widely available since Sept 2017 (MDN DateTimeFormat constructor page). Verified empirically: parts-reassembly === current hand-rolled output over 5,000 samples on both V8 (Node 22, ICU 78.2) and JSC (Bun 1.3.14), including 12:05 AM/PM edges.
  - Important: plain `.format()` **cannot** be used — the glue literal is not byte-stable across engines. Measured: identical options give `"Jun 5, 3:42 PM"` on V8/ICU 78 but `"Jun 5 at 3:42 PM"` on JSC (Bun 1.3.14); ICU 72-era browsers additionally emit U+202F before AM/PM. Values from Intl, glue hardcoded — see rewrite.
  - fix: see complete rewrite below. Also prefer `hourCycle: 'h12'` over `hour12: true` — MDN documents `hour12: true` as resolving to h11 _or_ h12 "depending on locale"; `'h12'` (1–12) states the invariant directly.

- [SIMPLIFICATION] `src/lib/utils/time.ts:70-89` — `formatRelativeHours` and `formatRelativeHoursMinutes` duplicate the `'0h'`/`'+Nh'`/`'+Nh Nm'` rendering; they differ only in rounding precision (nearest hour for zoomed-out axis ticks vs nearest minute for tooltips) and collapse behind one core.
  - evidence: differential fuzz over minutes −2000..20000 (with sub-minute offset) shows the collapsed version is output-identical for every input, including the pathological negative-offset shapes (`"+-2h"`) the current code produces.
  - fix: `formatOffsetMinutes` core in rewrite below.

- [STYLE] `src/lib/utils/time.ts:20` — private helper `formatTime` formats a _duration_, not a time-of-day; the misnomer is half the "nasty" impression, and the deliberate no-Intl decision is undocumented.
  - evidence: MDN `Intl.DurationFormat` (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DurationFormat) — **Baseline 2025, Newly available since March 2025** (not Widely available until ~Sept 2027, so as of mid-2026 it still excludes older browsers). And it cannot hit the required strings anyway: measured on the installed JSC (Bun 1.3.14), `en` narrow → `"2d 3h 4m"` (space glue, no commas), all-zero → `""` (per-unit `display: "auto"` hides zero units — MDN constructor page), while the app needs `"2d, 3h, 4m"` and `"0s"`. The list glue also varies by ICU: MDN's own en-short example shows `"1 hr, 46 min and 40 sec"` vs Bun's `"2 days, 3 hr, 4 min"`. Hand-rolled is deliberately better here: exact, engine-stable strings vs a Newly-available API that can't produce them.
  - fix: rename to `formatDuration`, add one-line rationale comment (in rewrite).

- [ANTI-PATTERN] `src/lib/components/markdown-timer.svelte:20-23` — four `$derived` lines of magic-number unit math (`timeLeft % (1000 * 60 * 60 * 24)` …) duplicate `intervalToDuration`, which exists one directory away for exactly this; the old app's `navigation-countdown.svelte` (a later-phase port) already consumes `intervalToDuration` correctly, so this would become the odd one out.
  - evidence: `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/src/lib/utils/time.ts:10-18` (identical semantics incl. the `Math.max(0, …)` clamp, making the component's own `Math.max(0, targetTime - now)` redundant too); `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web/src/lib/components/navigation-countdown.svelte:31`.
  - fix (answers the maintainer's question — **yes, the unit-splitting already lives in time.ts; the component should consume it; only the D:HH:MM:SS _markup_ stays in the component**). Replace lines 19–23 with:
    ```svelte
    const duration = $derived(intervalToDuration(targetTime - now))
    ```
    (add `import { intervalToDuration } from '$lib/utils/time'`), and in the template use `duration.days` / `pad(duration.hours)` / `pad(duration.minutes)` / `pad(duration.seconds)`. Keep `pad` local to the component for now; when `navigation-countdown` is ported (third pad-to-2 site alongside `formatCountdown`), promote a `pad2` export to `time.ts`.

- [STYLE] `src/lib/utils/time.ts` — no colocated `time.test.ts`; every function is a pure string formatter and the compat table below is ready-made fixtures. One `expect` block would lock the byte-exact contract the rewrite depends on.

Explicitly CORRECT per current docs (no change):

- Module-scope cached `Intl.DateTimeFormat` instance (line 59) — correct per MDN guidance to reuse formatters rather than construct per call.
- `formatCountdown` hand-rolled `M:SS` — Intl `digital` style cannot match: measured, it two-digit-pads minutes (`"04:05"` vs required `"4:05"`) and rolls 62 minutes into `"1:02:00"` vs required `"62:00"`.
- `intervalToDuration` keeping whole days instead of months — matches its comment; no Intl equivalent exists (Intl formats, it doesn't split).

## Paste-ready rewrite of `time.ts`

Prettier house style (no semis, single quotes, printWidth 80). Verified output-identical to current implementation: 200k-input differential fuzz across all duration/offset functions, 5k-sample cross-engine (V8+JSC) check for `formatLocalTime`.

```ts
export type Duration = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

// like date-fns', but it keeps the whole span in days instead of rolling 30+
// days into a `months` field we never render
export function intervalToDuration(ms: number): Duration {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  }
}

// deliberately not Intl.DurationFormat (Baseline 2025, newly available): en
// narrow renders '2d 3h 4m' -- no commas -- and '' when the span is zero
function formatDuration(ms: number): string {
  const { days, hours, minutes, seconds } = intervalToDuration(ms)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  return parts.length > 0 ? parts.join(', ') : `${seconds}s`
}

export function formatFirstBloodTime(
  timestamp: number,
  ctfStartTime: number
): string {
  return formatDuration(timestamp - ctfStartTime)
}

export function formatRelativeToFirstBlood(
  timestamp: number,
  firstBloodTime: number
): string {
  if (!firstBloodTime) {
    return ''
  }
  return `+${formatDuration(timestamp - firstBloodTime)}`
}

export function formatCtfOffset(
  timestamp: number,
  startTime: number | null | undefined
): string {
  if (startTime === null || startTime === undefined) return ''

  const diff = timestamp - startTime
  return `T${diff < 0 ? '-' : '+'}${formatDuration(Math.abs(diff))}`
}

const localTimeFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h12',
})

// values from Intl, glue hand-joined: `.format()` is not byte-stable across
// engines ('Jun 5, 3:42 PM' on V8 vs 'Jun 5 at 3:42 PM' on JSC), and this
// must keep matching the old date-fns format 'MMM d, h:mm a' exactly
export function formatLocalTime(timestamp: number): string {
  const parts = new Map(
    localTimeFormat.formatToParts(timestamp).map(p => [p.type, p.value])
  )
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.get(type) ?? ''
  return `${get('month')} ${get('day')}, ${get('hour')}:${get('minute')} ${get('dayPeriod')}`
}

function formatOffsetMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0 && minutes === 0) return '0h'
  if (minutes === 0) return `+${hours}h`
  return `+${hours}h ${minutes}m`
}

// nearest hour: graph axis ticks when zoomed out
export function formatRelativeHours(
  timestamp: number,
  startTime: number
): string {
  return formatOffsetMinutes(
    Math.round((timestamp - startTime) / 3_600_000) * 60
  )
}

// nearest minute: graph tooltips and zoomed-in axis ticks
export function formatRelativeHoursMinutes(
  timestamp: number,
  startTime: number
): string {
  return formatOffsetMinutes(Math.round((timestamp - startTime) / 60_000))
}

// minutes deliberately unbounded ('62:00'): Intl digital style would roll
// hours ('1:02:00') and two-digit-pad minutes ('04:05')
export function formatCountdown(ms: number): string {
  const mins = Math.floor(ms / 60_000)
  const secs = Math.floor((ms % 60_000) / 1000)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
```

## Compatibility table (all verified against current implementation)

| Function                        | Input (ms diff unless noted)                        | Output                             |
| ------------------------------- | --------------------------------------------------- | ---------------------------------- |
| `formatDuration` (via wrappers) | 0 / 999 / −60_000                                   | `0s`                               |
|                                 | 45_000                                              | `45s`                              |
|                                 | 90_000 (1m30s — seconds dropped once minutes exist) | `1m`                               |
|                                 | 3_660_000                                           | `1h, 1m`                           |
|                                 | 86_700_000 (1d 0h 5m — zero hours skipped)          | `1d, 5m`                           |
|                                 | 183_840_000                                         | `2d, 3h, 4m`                       |
| `formatRelativeToFirstBlood`    | firstBloodTime = 0                                  | `` (empty)                         |
|                                 | diff 11_040_000                                     | `+3h, 4m`                          |
| `formatCtfOffset`               | startTime null/undefined                            | `` (empty)                         |
|                                 | diff 0                                              | `T+0s`                             |
|                                 | diff −60_000                                        | `T-1m`                             |
|                                 | diff 3_660_000                                      | `T+1h, 1m`                         |
| `formatLocalTime`               | 2026-06-05 15:42 local                              | `Jun 5, 3:42 PM`                   |
|                                 | 00:05 / 12:05 local                                 | `… 12:05 AM` / `… 12:05 PM`        |
| `formatRelativeHours`           | Δ 0 / Δ 29 min                                      | `0h`                               |
|                                 | Δ 30 min (rounds up) / Δ 90 min                     | `+1h` / `+2h`                      |
| `formatRelativeHoursMinutes`    | Δ 0                                                 | `0h`                               |
|                                 | Δ 45 min                                            | `+0h 45m`                          |
|                                 | Δ 90 min / Δ 120 min                                | `+1h 30m` / `+2h`                  |
| `formatCountdown`               | 0 / 59_400 / 245_000 / 3_720_000                    | `0:00` / `0:59` / `4:05` / `62:00` |

Note: for negative offsets `formatRelativeHours*` emit shapes like `+-2h` — unreachable from real call sites (axis values ≥ startTime) and preserved bit-for-bit by the rewrite; do not "fix" without a compat decision.

## VERDICT

The file is in better shape than "nasty" suggests: every output is correct, the formatter is cached, and the two places it avoids Intl (`formatDuration`, `formatCountdown`) are the _right_ calls — Intl.DurationFormat is only Baseline 2025 Newly available (MDN, March 2025) and demonstrably cannot produce `"2d, 3h, 4m"`, `"0s"`, or `"62:00"` on the installed engines. What earns the label is structure, not correctness: a misnamed core (`formatTime`), a half-Intl `formatLocalTime` that reimplements clock math ICU already did, twin `formatRelativeHours*` bodies, and undocumented why-not-Intl decisions. Highest-leverage changes: (1) `formatLocalTime` via `formatToParts` reassembly — all values from Intl, deterministic glue, byte-identical on V8 and JSC; (2) collapse the relative-offset pair behind `formatOffsetMinutes` and rename `formatTime` → `formatDuration` with one-line rationale comments so the deliberate non-Intl paths read as decisions rather than omissions; (3) make `markdown-timer.svelte` consume `intervalToDuration` instead of inlining the same unit math — unit-splitting belongs in `time.ts` and is already there. Add a `time.test.ts` from the compat table to freeze the contract before later phases pile consumers onto it.
