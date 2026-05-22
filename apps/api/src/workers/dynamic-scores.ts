import { config } from '@rctf/config'
import { createDatabase, type DynamicScoringSource } from '@rctf/db'
import {
  ChallengeScoringKind,
  DynamicScoresPayloadSchema,
  DynamicScoringTransport,
} from '@rctf/types'
import { pino } from 'pino'
import {
  getDynamicChallenges,
  upsertDynamicSolves,
  type DynamicChallengeInfo,
} from '../services/solve-points'
import { createRedis } from '../util/redis'
import { forceLeaderboardUpdate } from './index'

const logger = pino().child({ module: 'dynamic-scores-worker' })
const { db } = createDatabase(config.database.sql)
const redis = await createRedis()

const DEFAULT_POLL_INTERVAL_S = 30
const MIN_POLL_INTERVAL_S = 5
const MAX_BACKOFF_MS = 5 * 60 * 1000

let pollable: DynamicChallengeInfo[] = []
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const failures = new Map<string, number>()

const sourceOf = (c: DynamicChallengeInfo): DynamicScoringSource =>
  (c.data.scoring as { source: DynamicScoringSource }).source

const pollOnce = async (c: DynamicChallengeInfo): Promise<boolean> => {
  try {
    const res = await fetch(sourceOf(c).url!, {
      headers: {
        accept: 'application/json',
        'user-agent': 'rctf-dynamic-scores/1.0',
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      logger.warn(
        { challengeId: c.id, status: res.status },
        'dynamic poll non-2xx'
      )
      return false
    }

    const parsed = DynamicScoresPayloadSchema.safeParse(await res.json())
    if (!parsed.success) {
      logger.warn(
        { challengeId: c.id, issues: parsed.error.issues },
        'dynamic poll payload failed validation'
      )
      return false
    }

    const r = await upsertDynamicSolves(db, c.id, parsed.data.scores)

    if (r.inserted + r.updated + r.deleted > 0) {
      forceLeaderboardUpdate(redis)
    }

    return true
  } catch (err) {
    logger.warn({ err, challengeId: c.id }, 'dynamic poll failed')
    return false
  }
}

const stopLoop = (id: string): void => {
  clearTimeout(timers.get(id))
  timers.delete(id)
  failures.delete(id)
}

const schedule = (id: string, delayMs: number): void => {
  timers.set(
    id,
    setTimeout(() => {
      runLoop(id).catch(err => {
        logger.error({ err, challengeId: id }, 'poll loop crashed')
      })
    }, delayMs)
  )
}

const runLoop = async (id: string): Promise<void> => {
  const c = pollable.find(x => x.id === id)
  if (!c) {
    stopLoop(id)
    return
  }

  const pollSeconds = sourceOf(c).pollIntervalSeconds ?? DEFAULT_POLL_INTERVAL_S
  const intervalMs = Math.max(MIN_POLL_INTERVAL_S, pollSeconds) * 1000
  const ok = await pollOnce(c)
  if (!pollable.some(x => x.id === id)) {
    stopLoop(id)
    return
  }

  const f = ok ? 0 : (failures.get(id) ?? 0) + 1
  if (ok) {
    failures.delete(id)
  } else {
    failures.set(id, f)
  }
  schedule(
    id,
    ok ? intervalMs : Math.min(MAX_BACKOFF_MS, intervalMs * 2 ** Math.min(f, 6))
  )
}

const refresh = async (): Promise<void> => {
  try {
    pollable = (await getDynamicChallenges(db)).filter(
      ch =>
        ch.data.scoring?.kind === ChallengeScoringKind.DYNAMIC &&
        ch.data.scoring.source.transport === DynamicScoringTransport.POLL &&
        typeof ch.data.scoring.source.url === 'string' &&
        ch.data.scoring.source.url.length > 0
    )

    const ids = new Set(pollable.map(c => c.id))
    for (const id of timers.keys()) {
      if (!ids.has(id)) {
        stopLoop(id)
      }
    }
    for (const c of pollable) {
      if (!timers.has(c.id)) {
        schedule(c.id, 0)
      }
    }
  } catch (err) {
    logger.error({ err }, 'failed to refresh dynamic challenge list')
  }
}

await refresh()
setInterval(refresh, 3_000)
