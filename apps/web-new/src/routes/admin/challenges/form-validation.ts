import { ChallengeScoringKind, UpdateChallengeRouteV2 } from '@rctf/types'
import type { InlineArgs } from '$lib/api'
import type { EditorForm } from './editor-state'

/** Per-field validation messages, keyed by the form field they belong to. */
export interface FormErrors {
  name?: string
  category?: string
  author?: string
  description?: string
  flag?: string
  secret?: string
}

/**
 * Computes every validation error for the current form. The flag is required
 * only for non-dynamic scoring; the webhook secret is required only for dynamic
 * scoring (AE2). Callers show a message once its field is touched, but the set
 * itself is always current.
 *
 * @param form - The in-progress editor form.
 */
export function formErrors(form: EditorForm): FormErrors {
  const errors: FormErrors = {}
  if (form.name.trim() === '') errors.name = 'Name is required'
  if (form.category.trim() === '') errors.category = 'Category is required'
  if (form.author.trim() === '') errors.author = 'Author is required'
  if (form.description.trim() === '') {
    errors.description = 'Description is required'
  }
  if (form.scoring.kind === ChallengeScoringKind.DYNAMIC) {
    if (form.scoring.source.secret.trim() === '') {
      errors.secret = 'Webhook secret is required'
    }
  } else if (form.flag.trim() === '') {
    errors.flag = 'Flag is required'
  }
  return errors
}

/** Whether any field on the form is currently invalid. */
export function hasFormErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Whether the Details tab holds an invalid field (drives its error badge). */
export function detailsTabInvalid(errors: FormErrors): boolean {
  return Boolean(
    errors.name ||
    errors.category ||
    errors.author ||
    errors.description ||
    errors.flag
  )
}

/** Whether the Scoring tab holds an invalid field (drives its error badge). */
export function scoringTabInvalid(errors: FormErrors): boolean {
  return Boolean(errors.secret)
}

/**
 * The scoring kind is locked once a challenge has solves: changing it would
 * strand the existing solves under an incompatible scoring model.
 *
 * @param totalSolves - Solve count from the player challenges list.
 */
export function scoringKindLocked(totalSolves: number): boolean {
  return totalSolves > 0
}

/**
 * Formats a Unix ms timestamp as a `datetime-local` value in local time, or an
 * empty string when unset. Seconds are dropped to match the input's precision.
 *
 * @param ts - Release time as a Unix ms timestamp, or null when unset.
 */
export function releaseTimeToInput(ts: number | null): string {
  if (ts === null) return ''
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Parses a `datetime-local` value (local time) back into a Unix ms timestamp,
 * or null when empty or unparseable.
 *
 * @param value - The raw `datetime-local` input value.
 */
export function inputToReleaseTime(value: string): number | null {
  if (value === '') return null
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

/**
 * Builds the `PUT /v2/admin/challs/:id` payload from the form. Dynamic scoring
 * forces an empty flag, a disabled admin bot serializes to null, and a zero
 * sort weight collapses to undefined so the server keeps its default ordering.
 *
 * @param form - The form to serialize.
 * @param id - The challenge id (client-generated UUID when creating; AE10).
 */
export function buildSavePayload(
  form: EditorForm,
  id: string
): InlineArgs<typeof UpdateChallengeRouteV2> {
  const isDynamic = form.scoring.kind === ChallengeScoringKind.DYNAMIC
  return {
    id,
    data: {
      name: form.name,
      category: form.category,
      author: form.author,
      description: form.description,
      flag: isDynamic ? '' : form.flag,
      points: { min: form.pointsMin, max: form.pointsMax },
      tiebreakEligible: form.tiebreakEligible,
      sortWeight: form.sortWeight || undefined,
      tags: form.tags,
      files: form.files,
      instancerConfig: form.instancerConfig,
      adminBotConfig: form.adminBotConfig.enabled
        ? { code: form.adminBotConfig.code }
        : null,
      hidden: form.hidden,
      releaseTime: form.releaseTime,
      scoring: form.scoring,
    },
  }
}
