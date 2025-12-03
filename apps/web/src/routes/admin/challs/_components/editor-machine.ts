import type { AdminChallenge, AdminChallengeDetail } from '$lib/api'
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
  | {
      type: 'UPDATE_FILES'
      files: { name: string; url: string; size: number | null }[]
    }
  | { type: 'PREVIEW' }
  | { type: 'CLOSE_PREVIEW' }

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
}

function formFromChallenge(challenge: AdminChallenge): FormData {
  return {
    name: challenge.name,
    category: challenge.category,
    author: challenge.author,
    description: challenge.description ?? '',
    flag: challenge.flag ?? '',
    pointsMin: challenge.points.min,
    pointsMax: challenge.points.max,
    tiebreakEligible: challenge.tiebreakEligible,
    sortWeight: challenge.sortWeight ?? 0,
    files: challenge.files ? [...challenge.files] : [],
  }
}

function formFromDetail(detail: AdminChallengeDetail): FormData {
  return {
    name: detail.name,
    category: detail.category,
    author: detail.author,
    description: detail.description,
    flag: detail.flag,
    pointsMin: detail.points.min,
    pointsMax: detail.points.max,
    tiebreakEligible: detail.tiebreakEligible,
    sortWeight: detail.sortWeight ?? 0,
    files: detail.files ? [...detail.files] : [],
  }
}

function hasChanges(form: FormData, original: FormData | null): boolean {
  if (!original) {
    return !!(
      form.name ||
      form.category ||
      form.author ||
      form.description ||
      form.flag ||
      form.files.length > 0
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
    JSON.stringify(form.files) !== JSON.stringify(original.files)
  )
}

export const editorMachine = setup({
  types: {
    context: {} as EditorContext,
    events: {} as EditorEvent,
  },
  guards: {
    hasUnsavedChanges: ({ context }) =>
      hasChanges(context.form, context.originalForm),
    noUnsavedChanges: ({ context }) =>
      !hasChanges(context.form, context.originalForm),
  },
  actions: {
    resetToEmpty: assign({
      challenge: null,
      challengeDetail: null,
      form: emptyForm,
      originalForm: null,
    }),
    selectChallenge: assign(({ event }) => {
      if (event.type !== 'SELECT') return {}
      const challenge = event.challenge
      if (!challenge) {
        return {
          challenge: null,
          challengeDetail: null,
          form: emptyForm,
          originalForm: null,
        }
      }
      const form = formFromChallenge(challenge)
      return {
        challenge,
        challengeDetail: null,
        form,
        originalForm: form,
      }
    }),
    loadDetail: assign(({ context, event }) => {
      if (event.type !== 'DETAIL_LOADED') return {}
      const form = formFromDetail(event.detail)
      return {
        challengeDetail: event.detail,
        form,
        originalForm: form,
      }
    }),
    startCreating: assign({
      challenge: null,
      challengeDetail: null,
      form: emptyForm,
      originalForm: null,
    }),
    updateForm: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_FORM') return {}
      return {
        form: { ...context.form, [event.field]: event.value },
      }
    }),
    updateFiles: assign(({ context, event }) => {
      if (event.type !== 'UPDATE_FILES') return {}
      return {
        form: { ...context.form, files: event.files },
      }
    }),
    resetForm: assign(({ context }) => ({
      form: context.originalForm ? { ...context.originalForm } : emptyForm,
    })),
    storePendingAction: assign(({ event }) => {
      if (event.type !== 'CHECK_UNSAVED') return {}
      return { pendingAction: event.pendingAction }
    }),
    clearPendingAction: assign({ pendingAction: null }),
    executePendingAction: ({ context }) => {
      context.pendingAction?.()
    },
    updateAfterSave: assign(({ event }) => {
      if (event.type !== 'SAVE_SUCCESS') return {}
      const form = formFromChallenge(event.challenge)
      return {
        challenge: event.challenge,
        form,
        originalForm: form,
      }
    }),
  },
}).createMachine({
  id: 'challengeEditor',
  initial: 'idle',
  context: {
    challenge: null,
    challengeDetail: null,
    form: emptyForm,
    originalForm: null,
    pendingAction: null,
  },
  states: {
    idle: {
      on: {
        SELECT: {
          target: 'viewing',
          actions: 'selectChallenge',
        },
        CREATE: {
          target: 'creating',
          actions: 'startCreating',
        },
      },
    },
    viewing: {
      on: {
        SELECT: [
          {
            guard: 'hasUnsavedChanges',
            target: 'confirmDiscard',
            actions: assign(({ event }) => ({
              pendingAction: event.type === 'SELECT' ? () => {} : null,
            })),
          },
          {
            actions: 'selectChallenge',
          },
        ],
        CREATE: [
          {
            guard: 'hasUnsavedChanges',
            target: 'confirmDiscard',
            actions: assign({ pendingAction: () => {} }),
          },
          {
            target: 'creating',
            actions: 'startCreating',
          },
        ],
        DETAIL_LOADED: {
          actions: 'loadDetail',
        },
        EDIT: 'editing',
        CHECK_UNSAVED: [
          {
            guard: 'hasUnsavedChanges',
            target: 'confirmDiscard',
            actions: 'storePendingAction',
          },
          {
            actions: [
              'storePendingAction',
              'executePendingAction',
              'clearPendingAction',
            ],
          },
        ],
      },
    },
    editing: {
      on: {
        UPDATE_FORM: {
          actions: 'updateForm',
        },
        UPDATE_FILES: {
          actions: 'updateFiles',
        },
        CANCEL: [
          {
            guard: 'hasUnsavedChanges',
            target: 'confirmDiscard',
            actions: assign({ pendingAction: () => {} }),
          },
          {
            target: 'viewing',
            actions: 'resetForm',
          },
        ],
        SAVE: 'saving',
        DELETE: 'confirmDelete',
        SELECT: [
          {
            guard: 'hasUnsavedChanges',
            target: 'confirmDiscard',
            actions: assign(({ event }) => ({
              pendingAction: event.type === 'SELECT' ? () => {} : null,
            })),
          },
          {
            target: 'viewing',
            actions: 'selectChallenge',
          },
        ],
        CREATE: [
          {
            guard: 'hasUnsavedChanges',
            target: 'confirmDiscard',
            actions: assign({ pendingAction: () => {} }),
          },
          {
            target: 'creating',
            actions: 'startCreating',
          },
        ],
        CHECK_UNSAVED: [
          {
            guard: 'hasUnsavedChanges',
            target: 'confirmDiscard',
            actions: 'storePendingAction',
          },
          {
            actions: [
              'storePendingAction',
              'executePendingAction',
              'clearPendingAction',
            ],
          },
        ],
      },
    },
    creating: {
      on: {
        UPDATE_FORM: {
          actions: 'updateForm',
        },
        UPDATE_FILES: {
          actions: 'updateFiles',
        },
        CANCEL: [
          {
            guard: 'hasUnsavedChanges',
            target: 'confirmDiscard',
            actions: assign({ pendingAction: () => {} }),
          },
          {
            target: 'idle',
            actions: 'resetToEmpty',
          },
        ],
        SAVE: 'saving',
        SELECT: [
          {
            guard: 'hasUnsavedChanges',
            target: 'confirmDiscard',
            actions: assign(({ event }) => ({
              pendingAction: event.type === 'SELECT' ? () => {} : null,
            })),
          },
          {
            target: 'viewing',
            actions: 'selectChallenge',
          },
        ],
        CHECK_UNSAVED: [
          {
            guard: 'hasUnsavedChanges',
            target: 'confirmDiscard',
            actions: 'storePendingAction',
          },
          {
            actions: [
              'storePendingAction',
              'executePendingAction',
              'clearPendingAction',
            ],
          },
        ],
      },
    },
    saving: {
      on: {
        SAVE_SUCCESS: {
          target: 'viewing',
          actions: 'updateAfterSave',
        },
        SAVE_ERROR: 'editing',
      },
    },
    confirmDiscard: {
      on: {
        DISCARD: {
          target: 'idle',
          actions: [
            'executePendingAction',
            'clearPendingAction',
            'resetToEmpty',
          ],
        },
        KEEP_EDITING: [
          {
            target: 'editing',
            guard: ({ context }) => context.challenge !== null,
            actions: 'clearPendingAction',
          },
          {
            target: 'creating',
            actions: 'clearPendingAction',
          },
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
        DELETE_SUCCESS: {
          target: 'idle',
          actions: 'resetToEmpty',
        },
        DELETE_ERROR: 'editing',
      },
    },
  },
})
