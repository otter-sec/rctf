import type {
  AdminChallenge,
  AdminChallengeDetail,
  InstancerConfig,
} from '$lib/api'
import { assign, setup } from 'xstate'

export interface FormData {
  name: string
  category: string
  author: string
  description: string
  flag: string
  pointsMin: number
  pointsMax: number
  tiebreakEligible: boolean
  sortWeight: number
  files: { name: string; url: string; size: number | null }[]
  instancerConfig: InstancerConfig | null
}

export interface EditorContext {
  challenge: AdminChallenge | null
  challengeDetail: AdminChallengeDetail | null
  form: FormData
  originalForm: FormData | null
  pendingAction: (() => void) | null
}

type EditorEvent =
  | { type: 'SELECT'; challenge: AdminChallenge | null }
  | { type: 'CREATE' }
  | { type: 'DETAIL_LOADED'; detail: AdminChallengeDetail }
  | { type: 'EDIT' }
  | { type: 'CANCEL' }
  | { type: 'SAVE' }
  | { type: 'SAVE_SUCCESS'; challenge: AdminChallenge }
  | { type: 'SAVE_ERROR' }
  | { type: 'DELETE' }
  | { type: 'DELETE_CONFIRM' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' }
  | { type: 'DISCARD' }
  | { type: 'KEEP_EDITING' }
  | { type: 'CHECK_UNSAVED'; pendingAction: () => void }
  | { type: 'UPDATE_FORM'; field: keyof FormData; value: unknown }
  | { type: 'UPDATE_FILES'; files: FormData['files'] }
  | { type: 'UPDATE_INSTANCER'; instancerConfig: InstancerConfig | null }
  | { type: 'PREVIEW' }
  | { type: 'CLOSE_PREVIEW' }

const empty: FormData = {
  name: '',
  category: '',
  author: '',
  description: '',
  flag: '',
  pointsMin: 100,
  pointsMax: 500,
  tiebreakEligible: true,
  sortWeight: 0,
  files: [],
  instancerConfig: null,
}

const fromChallenge = (c: AdminChallenge): FormData => ({
  name: c.name,
  category: c.category,
  author: c.author,
  description: c.description ?? '',
  flag: c.flag ?? '',
  pointsMin: c.points.min,
  pointsMax: c.points.max,
  tiebreakEligible: c.tiebreakEligible,
  sortWeight: c.sortWeight ?? 0,
  files: c.files ? [...c.files] : [],
  instancerConfig: c.instancerConfig ?? null,
})

const fromDetail = (d: AdminChallengeDetail): FormData => ({
  name: d.name,
  category: d.category,
  author: d.author,
  description: d.description,
  flag: d.flag,
  pointsMin: d.points.min,
  pointsMax: d.points.max,
  tiebreakEligible: d.tiebreakEligible,
  sortWeight: d.sortWeight ?? 0,
  files: d.files ? [...d.files] : [],
  instancerConfig: d.instancerConfig ?? null,
})

const isDirty = (form: FormData, original: FormData | null): boolean => {
  if (!original) {
    return !!(
      form.name ||
      form.category ||
      form.author ||
      form.description ||
      form.flag ||
      form.files.length ||
      form.instancerConfig
    )
  }
  return (
    form.name !== original.name ||
    form.category !== original.category ||
    form.author !== original.author ||
    form.description !== original.description ||
    form.flag !== original.flag ||
    form.pointsMin !== original.pointsMin ||
    form.pointsMax !== original.pointsMax ||
    form.tiebreakEligible !== original.tiebreakEligible ||
    form.sortWeight !== original.sortWeight ||
    JSON.stringify(form.files) !== JSON.stringify(original.files) ||
    JSON.stringify(form.instancerConfig) !==
      JSON.stringify(original.instancerConfig)
  )
}

const resetCtx = {
  challenge: null,
  challengeDetail: null,
  form: empty,
  originalForm: null,
}

export const editorMachine = setup({
  types: { context: {} as EditorContext, events: {} as EditorEvent },
  guards: {
    dirty: ({ context }) => isDirty(context.form, context.originalForm),
    clean: ({ context }) => !isDirty(context.form, context.originalForm),
  },
  actions: {
    reset: assign(resetCtx),
    select: assign(({ event }) => {
      if (event.type !== 'SELECT') return {}
      if (!event.challenge) return resetCtx
      const form = fromChallenge(event.challenge)
      return {
        challenge: event.challenge,
        challengeDetail: null,
        form,
        originalForm: form,
      }
    }),
    loadDetail: assign(({ event }) => {
      if (event.type !== 'DETAIL_LOADED') return {}
      const form = fromDetail(event.detail)
      return { challengeDetail: event.detail, form, originalForm: form }
    }),
    startCreate: assign({
      challenge: null,
      challengeDetail: null,
      form: empty,
      originalForm: null,
    }),
    updateForm: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_FORM') return {}
      return { form: { ...context.form, [event.field]: event.value } }
    }),
    updateFiles: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_FILES') return {}
      return { form: { ...context.form, files: event.files } }
    }),
    updateInstancer: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_INSTANCER') return {}
      return {
        form: { ...context.form, instancerConfig: event.instancerConfig },
      }
    }),
    resetForm: assign(({ context }) => ({
      form: context.originalForm ? { ...context.originalForm } : empty,
    })),
    storePending: assign(({ event }) =>
      event.type === 'CHECK_UNSAVED'
        ? { pendingAction: event.pendingAction }
        : {}
    ),
    clearPending: assign({ pendingAction: null }),
    execPending: ({ context }) => context.pendingAction?.(),
    afterSave: assign(({ event }) => {
      if (event.type !== 'SAVE_SUCCESS') return {}
      const form = fromChallenge(event.challenge)
      return { challenge: event.challenge, form, originalForm: form }
    }),
  },
}).createMachine({
  id: 'editor',
  initial: 'idle',
  context: {
    challenge: null,
    challengeDetail: null,
    form: empty,
    originalForm: null,
    pendingAction: null,
  },
  states: {
    idle: {
      on: {
        SELECT: { target: 'viewing', actions: 'select' },
        CREATE: { target: 'creating', actions: 'startCreate' },
      },
    },
    viewing: {
      on: {
        SELECT: [
          {
            guard: 'dirty',
            target: 'confirmDiscard',
            actions: assign({ pendingAction: () => {} }),
          },
          { actions: 'select' },
        ],
        CREATE: [
          {
            guard: 'dirty',
            target: 'confirmDiscard',
            actions: assign({ pendingAction: () => {} }),
          },
          { target: 'creating', actions: 'startCreate' },
        ],
        DETAIL_LOADED: { actions: 'loadDetail' },
        EDIT: 'editing',
        CHECK_UNSAVED: [
          { guard: 'dirty', target: 'confirmDiscard', actions: 'storePending' },
          { actions: ['storePending', 'execPending', 'clearPending'] },
        ],
      },
    },
    editing: {
      on: {
        UPDATE_FORM: { actions: 'updateForm' },
        UPDATE_FILES: { actions: 'updateFiles' },
        UPDATE_INSTANCER: { actions: 'updateInstancer' },
        CANCEL: [
          {
            guard: 'dirty',
            target: 'confirmDiscard',
            actions: assign({ pendingAction: () => {} }),
          },
          { target: 'viewing', actions: 'resetForm' },
        ],
        SAVE: 'saving',
        DELETE: 'confirmDelete',
        SELECT: [
          {
            guard: 'dirty',
            target: 'confirmDiscard',
            actions: assign({ pendingAction: () => {} }),
          },
          { target: 'viewing', actions: 'select' },
        ],
        CREATE: [
          {
            guard: 'dirty',
            target: 'confirmDiscard',
            actions: assign({ pendingAction: () => {} }),
          },
          { target: 'creating', actions: 'startCreate' },
        ],
        CHECK_UNSAVED: [
          { guard: 'dirty', target: 'confirmDiscard', actions: 'storePending' },
          { actions: ['storePending', 'execPending', 'clearPending'] },
        ],
      },
    },
    creating: {
      on: {
        UPDATE_FORM: { actions: 'updateForm' },
        UPDATE_FILES: { actions: 'updateFiles' },
        UPDATE_INSTANCER: { actions: 'updateInstancer' },
        CANCEL: [
          {
            guard: 'dirty',
            target: 'confirmDiscard',
            actions: assign({ pendingAction: () => {} }),
          },
          { target: 'idle', actions: 'reset' },
        ],
        SAVE: 'saving',
        SELECT: [
          {
            guard: 'dirty',
            target: 'confirmDiscard',
            actions: assign({ pendingAction: () => {} }),
          },
          { target: 'viewing', actions: 'select' },
        ],
        CHECK_UNSAVED: [
          { guard: 'dirty', target: 'confirmDiscard', actions: 'storePending' },
          { actions: ['storePending', 'execPending', 'clearPending'] },
        ],
      },
    },
    saving: {
      on: {
        SAVE_SUCCESS: { target: 'viewing', actions: 'afterSave' },
        SAVE_ERROR: 'editing',
      },
    },
    confirmDiscard: {
      on: {
        DISCARD: {
          target: 'idle',
          actions: ['execPending', 'clearPending', 'reset'],
        },
        KEEP_EDITING: [
          {
            target: 'editing',
            guard: ({ context }) => context.challenge !== null,
            actions: 'clearPending',
          },
          { target: 'creating', actions: 'clearPending' },
        ],
      },
    },
    confirmDelete: {
      on: {
        DELETE_CONFIRM: 'deleting',
        DELETE_CANCEL: 'editing',
      },
    },
    deleting: {
      on: {
        DELETE_SUCCESS: { target: 'idle', actions: 'reset' },
        DELETE_ERROR: 'editing',
      },
    },
  },
})
