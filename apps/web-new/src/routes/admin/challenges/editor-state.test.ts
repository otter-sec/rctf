import type { AdminChallenge, AdminChallengeDetail } from '@rctf/types'
import { ChallengeScoringKind, DynamicScoringTransport } from '@rctf/types'
import { describe, expect, test } from 'bun:test'
import {
  cancel,
  create,
  createEditorState,
  defaultForm,
  del,
  deleteCancel,
  deleteConfirm,
  deleteError,
  deleteSuccess,
  detailLoaded,
  discard,
  edit,
  isDirty,
  keepEditing,
  save,
  saveError,
  saveSuccess,
  select,
  updateAdminBot,
  updateForm,
  updateInstancer,
  updateScoring,
} from './editor-state'

function makeChallenge(
  overrides: Partial<AdminChallenge> & Pick<AdminChallenge, 'id'>
): AdminChallenge {
  return {
    name: overrides.id,
    description: '',
    category: 'misc',
    author: 'author',
    files: [],
    points: { min: 100, max: 500 },
    flag: '',
    tiebreakEligible: true,
    sortWeight: null,
    tags: null,
    instancerConfig: null,
    adminBotConfig: null,
    hidden: false,
    releaseTime: null,
    scoring: null,
    ...overrides,
  }
}

const detail = (
  overrides: Partial<AdminChallengeDetail> & Pick<AdminChallengeDetail, 'id'>
): AdminChallengeDetail => makeChallenge(overrides)

const dynamicScoring = {
  kind: ChallengeScoringKind.DYNAMIC,
  source: {
    transport: DynamicScoringTransport.WEBHOOK,
    secret: 'shhh',
  },
} as const

describe('initial state', () => {
  test('createEditorState is idle and empty', () => {
    const state = createEditorState()
    expect(state.mode).toBe('idle')
    expect(state.challenge).toBeNull()
    expect(state.originalForm).toBeNull()
    expect(state.pending).toBeNull()
    expect(state.wasCreating).toBe(false)
    expect(state.detailSeededId).toBeNull()
    expect(state.form).toEqual(defaultForm())
  })

  test('defaultForm carries the documented defaults', () => {
    const form = defaultForm()
    expect(form.pointsMin).toBe(50)
    expect(form.pointsMax).toBe(500)
    expect(form.tiebreakEligible).toBe(true)
    expect(form.sortWeight).toBe(0)
    expect(form.hidden).toBe(false)
    expect(form.scoring).toEqual({ kind: ChallengeScoringKind.DECAY })
    expect(form.adminBotConfig).toEqual({ enabled: false, code: '' })
  })
})

describe('select', () => {
  test('clean SELECT from idle switches to viewing and seeds both forms', () => {
    const challenge = makeChallenge({ id: 'a', name: 'Alpha', flag: 'f' })
    const state = select(createEditorState(), challenge)
    expect(state.mode).toBe('viewing')
    expect(state.challenge).toBe(challenge)
    expect(state.form.name).toBe('Alpha')
    expect(state.form).toEqual(state.originalForm!)
    expect(isDirty(state)).toBe(false)
  })

  test('SELECT with null returns to idle', () => {
    const state = select(
      select(createEditorState(), makeChallenge({ id: 'a' })),
      null
    )
    expect(state.mode).toBe('idle')
    expect(state.challenge).toBeNull()
    expect(state.originalForm).toBeNull()
  })

  test('clean SELECT from viewing switches directly to the next challenge', () => {
    let state = select(createEditorState(), makeChallenge({ id: 'a' }))
    state = select(state, makeChallenge({ id: 'b', name: 'Bravo' }))
    expect(state.mode).toBe('viewing')
    expect(state.form.name).toBe('Bravo')
  })

  test('dirty SELECT from editing routes through confirmDiscard with pending select', () => {
    const target = makeChallenge({ id: 'b' })
    let state = select(createEditorState(), makeChallenge({ id: 'a' }))
    state = edit(state)
    state = updateForm(state, 'name', 'changed')
    expect(isDirty(state)).toBe(true)
    state = select(state, target)
    expect(state.mode).toBe('confirmDiscard')
    expect(state.pending).toEqual({ type: 'select', challenge: target })
  })
})

describe('confirmDiscard resolution', () => {
  test('DISCARD applies the pending selection', () => {
    const target = makeChallenge({ id: 'b', name: 'Bravo' })
    let state = select(createEditorState(), makeChallenge({ id: 'a' }))
    state = updateForm(edit(state), 'name', 'changed')
    state = select(state, target)
    state = discard(state)
    expect(state.mode).toBe('viewing')
    expect(state.challenge).toBe(target)
    expect(state.form.name).toBe('Bravo')
    expect(state.pending).toBeNull()
  })

  test('KEEP_EDITING returns to editing when a challenge is selected', () => {
    let state = select(createEditorState(), makeChallenge({ id: 'a' }))
    state = updateForm(edit(state), 'name', 'changed')
    state = select(state, makeChallenge({ id: 'b' }))
    state = keepEditing(state)
    expect(state.mode).toBe('editing')
    expect(state.form.name).toBe('changed')
    expect(state.pending).toBeNull()
  })

  test('KEEP_EDITING returns to creating when there is no challenge', () => {
    let state = create(createEditorState())
    state = updateForm(state, 'name', 'new')
    state = select(state, makeChallenge({ id: 'b' }))
    expect(state.mode).toBe('confirmDiscard')
    state = keepEditing(state)
    expect(state.mode).toBe('creating')
    expect(state.form.name).toBe('new')
  })
})

describe('detailLoaded per-id guard', () => {
  test('seeds once per id and re-seeds only for a new id', () => {
    let state = select(createEditorState(), makeChallenge({ id: 'a' }))
    expect(state.detailSeededId).toBeNull()

    state = detailLoaded(state, detail({ id: 'a', description: 'full' }))
    expect(state.form.description).toBe('full')
    expect(state.detailSeededId).toBe('a')

    state = detailLoaded(state, detail({ id: 'a', description: 'CHANGED' }))
    expect(state.form.description).toBe('full')

    state = detailLoaded(state, detail({ id: 'b', description: 'other' }))
    expect(state.form.description).toBe('other')
    expect(state.detailSeededId).toBe('b')
  })

  test('a late detail response never reseeds while editing or creating', () => {
    let state = select(createEditorState(), makeChallenge({ id: 'a' }))
    state = updateForm(edit(state), 'name', 'typed')
    state = detailLoaded(state, detail({ id: 'a', description: 'late' }))
    expect(state.form.name).toBe('typed')
    expect(state.form.description).toBe('')
    expect(state.detailSeededId).toBeNull()

    let creating = create(createEditorState())
    creating = updateForm(creating, 'name', 'new one')
    creating = detailLoaded(creating, detail({ id: 'b', description: 'late' }))
    expect(creating.form.name).toBe('new one')
    expect(creating.form.description).toBe('')
  })

  test('does not re-seed for the same id after local edits', () => {
    let state = select(createEditorState(), makeChallenge({ id: 'a' }))
    state = detailLoaded(state, detail({ id: 'a', description: 'full' }))
    state = updateForm(edit(state), 'description', 'mine')
    state = detailLoaded(state, detail({ id: 'a', description: 'server' }))
    expect(state.form.description).toBe('mine')
  })
})

describe('save flow', () => {
  test('SAVE_ERROR returns to editing preserving the form', () => {
    let state = select(createEditorState(), makeChallenge({ id: 'a' }))
    state = updateForm(edit(state), 'name', 'changed')
    state = save(state)
    expect(state.mode).toBe('saving')
    expect(state.wasCreating).toBe(false)
    state = saveError(state)
    expect(state.mode).toBe('editing')
    expect(state.form.name).toBe('changed')
  })

  test('wasCreating is captured across saving and reset by success', () => {
    let state = create(createEditorState())
    state = updateForm(state, 'name', 'brand new')
    state = save(state)
    expect(state.mode).toBe('saving')
    expect(state.wasCreating).toBe(true)

    const saved = makeChallenge({ id: 'x', name: 'brand new' })
    state = saveSuccess(state, saved)
    expect(state.mode).toBe('viewing')
    expect(state.wasCreating).toBe(false)
    expect(state.challenge).toBe(saved)
    expect(state.form).toEqual(state.originalForm!)
    expect(isDirty(state)).toBe(false)
  })

  test('saveSuccess re-seeds canonical adminBotConfig from the response', () => {
    let state = create(createEditorState())
    state = save(updateForm(state, 'name', 'n'))
    const saved = makeChallenge({
      id: 'x',
      adminBotConfig: {
        code: 'bot-src',
        inputs: {},
        revision: '0',
        timeoutMilliseconds: 0,
      },
    })
    state = saveSuccess(state, saved)
    expect(state.form.adminBotConfig).toEqual({
      enabled: true,
      code: 'bot-src',
    })
  })
})

describe('delete flow', () => {
  test('DELETE_SUCCESS resets to idle', () => {
    let state = select(createEditorState(), makeChallenge({ id: 'a' }))
    state = del(edit(state))
    expect(state.mode).toBe('confirmDelete')
    state = deleteConfirm(state)
    expect(state.mode).toBe('deleting')
    state = deleteSuccess(state)
    expect(state.mode).toBe('idle')
    expect(state.challenge).toBeNull()
    expect(state.originalForm).toBeNull()
    expect(state.form).toEqual(defaultForm())
  })

  test('DELETE_CANCEL and DELETE_ERROR return to editing', () => {
    let state = del(
      edit(select(createEditorState(), makeChallenge({ id: 'a' })))
    )
    expect(deleteCancel(state).mode).toBe('editing')
    state = deleteError(deleteConfirm(state))
    expect(state.mode).toBe('editing')
  })
})

describe('cancel flow', () => {
  test('clean CANCEL from editing reverts to viewing', () => {
    let state = select(
      createEditorState(),
      makeChallenge({ id: 'a', name: 'Alpha' })
    )
    state = edit(state)
    state = cancel(state)
    expect(state.mode).toBe('viewing')
    expect(state.form.name).toBe('Alpha')
  })

  test('dirty CANCEL from editing routes through confirmDiscard and discard reverts', () => {
    let state = select(
      createEditorState(),
      makeChallenge({ id: 'a', name: 'Alpha' })
    )
    state = updateForm(edit(state), 'name', 'changed')
    state = cancel(state)
    expect(state.mode).toBe('confirmDiscard')
    expect(state.pending).toEqual({ type: 'cancel' })
    state = discard(state)
    expect(state.mode).toBe('viewing')
    expect(state.form.name).toBe('Alpha')
  })

  test('dirty CANCEL from creating discards to idle', () => {
    let state = updateForm(create(createEditorState()), 'name', 'wip')
    state = cancel(state)
    expect(state.mode).toBe('confirmDiscard')
    state = discard(state)
    expect(state.mode).toBe('idle')
    expect(state.form).toEqual(defaultForm())
  })
})

describe('create-mode dirty matrix', () => {
  test('a freshly created form is clean', () => {
    expect(isDirty(create(createEditorState()))).toBe(false)
  })

  const triggers: Array<[string, ReturnType<typeof create>]> = [
    ['name', updateForm(create(createEditorState()), 'name', 'x')],
    ['category', updateForm(create(createEditorState()), 'category', 'x')],
    ['author', updateForm(create(createEditorState()), 'author', 'x')],
    [
      'description',
      updateForm(create(createEditorState()), 'description', 'x'),
    ],
    ['flag', updateForm(create(createEditorState()), 'flag', 'x')],
    ['tags', updateForm(create(createEditorState()), 'tags', ['t'])],
    [
      'files',
      updateForm(create(createEditorState()), 'files', [
        { name: 'f', url: 'u', size: null },
      ]),
    ],
    [
      'adminBot.enabled',
      updateAdminBot(create(createEditorState()), { enabled: true, code: '' }),
    ],
    [
      'adminBot.code',
      updateAdminBot(create(createEditorState()), {
        enabled: false,
        code: 'c',
      }),
    ],
    [
      'instancer',
      updateInstancer(create(createEditorState()), {
        containerName: 'main',
      } as never),
    ],
  ]

  for (const [label, state] of triggers) {
    test(`${label} marks the create form dirty`, () => {
      expect(isDirty(state)).toBe(true)
    })
  }

  test('scoring and hidden do not mark a create form dirty', () => {
    let state = updateScoring(create(createEditorState()), dynamicScoring)
    expect(isDirty(state)).toBe(false)
    state = updateForm(state, 'hidden', true)
    expect(isDirty(state)).toBe(false)
  })
})

describe('scoring updates', () => {
  test('switching to DYNAMIC keeps the discriminated shape', () => {
    let state = edit(select(createEditorState(), makeChallenge({ id: 'a' })))
    state = updateScoring(state, dynamicScoring)
    expect(state.form.scoring).toEqual(dynamicScoring)
    expect(isDirty(state)).toBe(true)
  })
})

describe('immutability', () => {
  test('transitions never mutate the input state', () => {
    const base = select(createEditorState(), makeChallenge({ id: 'a' }))
    const snapshot = structuredClone(base)
    edit(base)
    updateForm(base, 'name', 'x')
    select(base, makeChallenge({ id: 'b' }))
    expect(base).toEqual(snapshot)
  })
})
