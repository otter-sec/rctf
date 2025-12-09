import type {
  AdminChallenge,
  AdminChallengeDetail,
  InstancerConfig,
} from '@rctf/types'
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
  form: FormData
  originalForm: FormData | null
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
  | { type: 'UPDATE_FORM'; field: keyof FormData; value: unknown }
  | { type: 'UPDATE_FILES'; files: FormData['files'] }
  | { type: 'UPDATE_INSTANCER'; instancerConfig: InstancerConfig | null }

const emptyForm: FormData = {
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
      form.files.length
    )
  }
  return JSON.stringify(form) !== JSON.stringify(original)
}

export const editorMachine = setup({
  types: { context: {} as EditorContext, events: {} as EditorEvent },
  guards: {
    dirty: ({ context }) => isDirty(context.form, context.originalForm),
    clean: ({ context }) => !isDirty(context.form, context.originalForm),
  },
  actions: {
    reset: assign({
      challenge: null,
      form: emptyForm,
      originalForm: null,
    }),
    select: assign(({ event }) => {
      if (event.type !== 'SELECT') return {}
      if (!event.challenge) {
        return { challenge: null, form: emptyForm, originalForm: null }
      }
      const form = fromChallenge(event.challenge)
      return { challenge: event.challenge, form, originalForm: form }
    }),
    loadDetail: assign(({ event }) => {
      if (event.type !== 'DETAIL_LOADED') return {}
      const form = fromDetail(event.detail)
      return { form, originalForm: form }
    }),
    startCreate: assign({
      challenge: null,
      form: emptyForm,
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
      form: context.originalForm ? { ...context.originalForm } : emptyForm,
    })),
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
    form: emptyForm,
    originalForm: null,
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
          { guard: 'dirty', target: 'confirmDiscard' },
          { actions: 'select' },
        ],
        CREATE: [
          { guard: 'dirty', target: 'confirmDiscard' },
          { target: 'creating', actions: 'startCreate' },
        ],
        DETAIL_LOADED: { actions: 'loadDetail' },
        EDIT: 'editing',
      },
    },
    editing: {
      on: {
        UPDATE_FORM: { actions: 'updateForm' },
        UPDATE_FILES: { actions: 'updateFiles' },
        UPDATE_INSTANCER: { actions: 'updateInstancer' },
        CANCEL: [
          { guard: 'dirty', target: 'confirmDiscard' },
          { target: 'viewing', actions: 'resetForm' },
        ],
        SAVE: 'saving',
        DELETE: 'confirmDelete',
        SELECT: [
          { guard: 'dirty', target: 'confirmDiscard' },
          { target: 'viewing', actions: 'select' },
        ],
        CREATE: [
          { guard: 'dirty', target: 'confirmDiscard' },
          { target: 'creating', actions: 'startCreate' },
        ],
      },
    },
    creating: {
      on: {
        UPDATE_FORM: { actions: 'updateForm' },
        UPDATE_FILES: { actions: 'updateFiles' },
        UPDATE_INSTANCER: { actions: 'updateInstancer' },
        CANCEL: [
          { guard: 'dirty', target: 'confirmDiscard' },
          { target: 'idle', actions: 'reset' },
        ],
        SAVE: 'saving',
        SELECT: [
          { guard: 'dirty', target: 'confirmDiscard' },
          { target: 'viewing', actions: 'select' },
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
        DISCARD: { target: 'idle', actions: 'reset' },
        KEEP_EDITING: [
          {
            target: 'editing',
            guard: ({ context }) => context.challenge !== null,
          },
          { target: 'creating' },
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
