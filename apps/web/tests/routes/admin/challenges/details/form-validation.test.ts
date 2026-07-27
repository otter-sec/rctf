import { ChallengeScoringKind, DynamicScoringTransport } from '@rctf/types'
import {
  buildSavePayload,
  detailsTabInvalid,
  formErrors,
  inputToReleaseTime,
  releaseTimeToInput,
  scoringKindLocked,
  scoringTabInvalid,
} from '$routes/admin/challenges/details/form-validation'
import {
  defaultForm,
  type EditorForm,
} from '$routes/admin/challenges/model/editor-state'
import { describe, expect, test } from 'bun:test'

function decayForm(overrides: Partial<EditorForm> = {}): EditorForm {
  return {
    ...defaultForm(),
    name: 'baby-rev',
    category: 'rev',
    author: 'es3n1n',
    description: 'A gentle introduction.',
    flags: [{ provider: 'flags/static', config: { flag: 'rctf{baby_rev}' } }],
    ...overrides,
  }
}

function dynamicForm(overrides: Partial<EditorForm> = {}): EditorForm {
  return decayForm({
    scoring: {
      kind: ChallengeScoringKind.DYNAMIC,
      source: { transport: DynamicScoringTransport.WEBHOOK, secret: 'sh' },
    },
    ...overrides,
  })
}

describe('formErrors', () => {
  test('a complete decay form has no errors', () => {
    expect(formErrors(decayForm())).toEqual({})
  })

  test('trims required text fields', () => {
    const errors = formErrors(
      decayForm({ name: '   ', category: '', author: ' ', description: '\t' })
    )
    expect(errors.name).toBeDefined()
    expect(errors.category).toBeDefined()
    expect(errors.author).toBeDefined()
    expect(errors.description).toBeDefined()
  })

  test('decay requires a flag but not a secret', () => {
    expect(formErrors(decayForm({ flags: [] })).flag).toBeDefined()
    expect(
      formErrors(
        decayForm({
          flags: [{ provider: 'flags/static', config: { flag: ' ' } }],
        })
      ).flag
    ).toBeDefined()
    expect(formErrors(decayForm({ flags: [] })).secret).toBeUndefined()
  })

  test('dynamic drops the flag requirement and adds a secret requirement', () => {
    expect(formErrors(dynamicForm({ flags: [] })).flag).toBeUndefined()
    const missingSecret = dynamicForm({
      scoring: {
        kind: ChallengeScoringKind.DYNAMIC,
        source: { transport: DynamicScoringTransport.WEBHOOK, secret: '  ' },
      },
    })
    expect(formErrors(missingSecret).secret).toBeDefined()
  })
})

describe('tab invalid flags', () => {
  test('details tab reflects name/category/author/description/flag', () => {
    expect(detailsTabInvalid(formErrors(decayForm()))).toBe(false)
    expect(detailsTabInvalid(formErrors(decayForm({ name: '' })))).toBe(true)
    expect(detailsTabInvalid(formErrors(decayForm({ flags: [] })))).toBe(true)
  })

  test('scoring tab reflects only the secret', () => {
    expect(scoringTabInvalid(formErrors(decayForm({ name: '' })))).toBe(false)
    const badSecret = dynamicForm({
      scoring: {
        kind: ChallengeScoringKind.DYNAMIC,
        source: { transport: DynamicScoringTransport.WEBHOOK, secret: '' },
      },
    })
    expect(scoringTabInvalid(formErrors(badSecret))).toBe(true)
  })
})

describe('scoringKindLocked', () => {
  test('locks once the challenge has any solves', () => {
    expect(scoringKindLocked(0)).toBe(false)
    expect(scoringKindLocked(1)).toBe(true)
    expect(scoringKindLocked(42)).toBe(true)
  })
})

describe('release-time converters', () => {
  test('null round-trips through empty string', () => {
    expect(releaseTimeToInput(null)).toBe('')
    expect(inputToReleaseTime('')).toBeNull()
  })

  test('a minute-aligned timestamp round-trips', () => {
    const ts = new Date(2025, 5, 15, 14, 30, 0, 0).getTime()
    expect(inputToReleaseTime(releaseTimeToInput(ts))).toBe(ts)
  })

  test('an unparseable value clears to null', () => {
    expect(inputToReleaseTime('not-a-date')).toBeNull()
  })
})

describe('buildSavePayload', () => {
  test('passes the id through and keeps decay fields', () => {
    const payload = buildSavePayload(decayForm(), 'chal-1')
    expect(payload.id).toBe('chal-1')
    expect(payload.data.flags).toEqual([
      { provider: 'flags/static', config: { flag: 'rctf{baby_rev}' } },
    ])
    expect(payload.data.scoring).toEqual({ kind: ChallengeScoringKind.DECAY })
  })

  test('dynamic scoring empties the flags', () => {
    const payload = buildSavePayload(
      dynamicForm({
        flags: [{ provider: 'flags/static', config: { flag: 'leftover' } }],
      }),
      'chal-1'
    )
    expect(payload.data.flags).toEqual([])
  })

  test('adminBotConfig is null when disabled and {code} when enabled', () => {
    const disabled = buildSavePayload(decayForm(), 'id')
    expect(disabled.data.adminBotConfig).toBeNull()
    const enabled = buildSavePayload(
      decayForm({ adminBotConfig: { enabled: true, code: 'run()' } }),
      'id'
    )
    expect(enabled.data.adminBotConfig).toEqual({ code: 'run()' })
  })

  test('a zero sort weight collapses to undefined', () => {
    expect(
      buildSavePayload(decayForm({ sortWeight: 0 }), 'id').data.sortWeight
    ).toBeUndefined()
    expect(
      buildSavePayload(decayForm({ sortWeight: 5 }), 'id').data.sortWeight
    ).toBe(5)
  })
})
