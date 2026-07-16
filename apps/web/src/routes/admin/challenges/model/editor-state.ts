import type {
  AdminChallenge,
  AdminChallengeDetail,
  InstancerConfig,
} from '@rctf/types'
import { ChallengeScoringKind, DynamicScoringTransport } from '@rctf/types'

export interface AdminBotConfig {
  enabled: boolean
  code: string
}

export type ScoringConfig =
  | { kind: ChallengeScoringKind.DECAY }
  | {
      kind: ChallengeScoringKind.DYNAMIC
      source: { transport: DynamicScoringTransport.WEBHOOK; secret: string }
    }

export interface EditorForm {
  name: string
  category: string
  author: string
  description: string
  flag: string
  dynamicFlagEnabled: boolean
  dynamicFlagBase: string
  dynamicFlagMode: string
  pointsMin: number
  pointsMax: number
  tiebreakEligible: boolean
  sortWeight: number
  tags: string[]
  files: { name: string; url: string; size: number | null }[]
  instancerConfig: InstancerConfig | null
  adminBotConfig: AdminBotConfig
  hidden: boolean
  releaseTime: number | null
  scoring: ScoringConfig
}

export type EditorMode =
  | 'idle'
  | 'viewing'
  | 'editing'
  | 'creating'
  | 'saving'
  | 'confirmDiscard'
  | 'confirmDelete'
  | 'deleting'

export type PendingIntent =
  | { type: 'select'; challenge: AdminChallenge | null }
  | { type: 'create' }
  | { type: 'cancel' }

export interface EditorState {
  mode: EditorMode
  challenge: AdminChallenge | null
  form: EditorForm
  originalForm: EditorForm | null
  pending: PendingIntent | null
  wasCreating: boolean
  detailSeededId: string | null
}

export function defaultForm(): EditorForm {
  return {
    name: '',
    category: '',
    author: '',
    description: '',
    flag: '',
    dynamicFlagEnabled: false,
    dynamicFlagBase: '',
    dynamicFlagMode: '',
    pointsMin: 50,
    pointsMax: 500,
    tiebreakEligible: true,
    sortWeight: 0,
    tags: [],
    files: [],
    instancerConfig: null,
    adminBotConfig: { enabled: false, code: '' },
    hidden: false,
    releaseTime: null,
    scoring: { kind: ChallengeScoringKind.DECAY },
  }
}

export function createEditorState(): EditorState {
  return {
    mode: 'idle',
    challenge: null,
    form: defaultForm(),
    originalForm: null,
    pending: null,
    wasCreating: false,
    detailSeededId: null,
  }
}

function scoringFromServer(
  scoring: AdminChallenge['scoring'] | undefined
): ScoringConfig {
  if (!scoring || scoring.kind === ChallengeScoringKind.DECAY) {
    return { kind: ChallengeScoringKind.DECAY }
  }
  return {
    kind: ChallengeScoringKind.DYNAMIC,
    source: {
      transport: DynamicScoringTransport.WEBHOOK,
      secret: scoring.source.secret,
    },
  }
}

function adminBotConfigFromServer(
  config: AdminChallenge['adminBotConfig']
): AdminBotConfig {
  return config
    ? { enabled: true, code: config.code }
    : { enabled: false, code: '' }
}

function seedForm(source: AdminChallenge | AdminChallengeDetail): EditorForm {
  return {
    name: source.name,
    category: source.category,
    author: source.author,
    description: source.description,
    flag: source.flag,
    dynamicFlagEnabled: Boolean(source.flags?.dynamic),
    dynamicFlagBase: source.flags?.dynamic?.base ?? '',
    dynamicFlagMode: source.flags?.dynamic?.mode ?? '',
    pointsMin: source.points.min,
    pointsMax: source.points.max,
    tiebreakEligible: source.tiebreakEligible,
    sortWeight: source.sortWeight ?? 0,
    tags: source.tags ? [...source.tags] : [],
    files: source.files ? [...source.files] : [],
    instancerConfig: source.instancerConfig ?? null,
    adminBotConfig: adminBotConfigFromServer(source.adminBotConfig),
    hidden: source.hidden ?? false,
    releaseTime: source.releaseTime ?? null,
    scoring: scoringFromServer(source.scoring),
  }
}

export function isDirty(state: EditorState): boolean {
  const { form, originalForm } = state
  return JSON.stringify(form) !== JSON.stringify(originalForm ?? defaultForm())
}

const EDIT_MODES: ReadonlySet<EditorMode> = new Set(['editing', 'creating'])

function applySelect(
  state: EditorState,
  challenge: AdminChallenge | null
): EditorState {
  if (!challenge) {
    return { ...createEditorState(), detailSeededId: state.detailSeededId }
  }
  const form = seedForm(challenge)
  return {
    ...state,
    mode: 'viewing',
    challenge,
    form,
    originalForm: form,
    pending: null,
    wasCreating: false,
  }
}

function applyCreate(state: EditorState): EditorState {
  return {
    ...state,
    mode: 'creating',
    challenge: null,
    form: defaultForm(),
    originalForm: null,
    pending: null,
    wasCreating: false,
    detailSeededId: null,
  }
}

export function select(
  state: EditorState,
  challenge: AdminChallenge | null
): EditorState {
  if (EDIT_MODES.has(state.mode) && isDirty(state)) {
    return {
      ...state,
      mode: 'confirmDiscard',
      pending: { type: 'select', challenge },
    }
  }
  return applySelect(state, challenge)
}

export function create(state: EditorState): EditorState {
  if (
    state.mode !== 'idle' &&
    state.mode !== 'viewing' &&
    state.mode !== 'editing'
  ) {
    return state
  }
  if (EDIT_MODES.has(state.mode) && isDirty(state)) {
    return { ...state, mode: 'confirmDiscard', pending: { type: 'create' } }
  }
  return applyCreate(state)
}

export function detailLoaded(
  state: EditorState,
  detail: AdminChallengeDetail
): EditorState {
  if (EDIT_MODES.has(state.mode) || state.detailSeededId === detail.id) {
    return state
  }
  const form = seedForm(detail)
  return { ...state, form, originalForm: form, detailSeededId: detail.id }
}

export function edit(state: EditorState): EditorState {
  if (state.mode !== 'viewing') {
    return state
  }
  return { ...state, mode: 'editing' }
}

export function cancel(state: EditorState): EditorState {
  if (state.mode !== 'editing' && state.mode !== 'creating') {
    return state
  }
  if (isDirty(state)) {
    return { ...state, mode: 'confirmDiscard', pending: { type: 'cancel' } }
  }
  return revertCancel(state)
}

function revertCancel(state: EditorState): EditorState {
  if (state.challenge) {
    return {
      ...state,
      mode: 'viewing',
      form: state.originalForm ?? defaultForm(),
      pending: null,
    }
  }
  return { ...createEditorState(), detailSeededId: state.detailSeededId }
}

export function save(state: EditorState): EditorState {
  if (state.mode !== 'editing' && state.mode !== 'creating') {
    return state
  }
  return { ...state, mode: 'saving', wasCreating: state.mode === 'creating' }
}

export function saveSuccess(
  state: EditorState,
  challenge: AdminChallenge
): EditorState {
  if (state.mode !== 'saving') {
    return state
  }
  const form = seedForm(challenge)
  return {
    ...state,
    mode: 'viewing',
    challenge,
    form,
    originalForm: form,
    pending: null,
    wasCreating: false,
    detailSeededId: challenge.id,
  }
}

export function saveError(state: EditorState): EditorState {
  if (state.mode !== 'saving') {
    return state
  }
  return { ...state, mode: state.wasCreating ? 'creating' : 'editing' }
}

export function del(state: EditorState): EditorState {
  if (state.mode !== 'editing') {
    return state
  }
  return { ...state, mode: 'confirmDelete' }
}

export function deleteConfirm(state: EditorState): EditorState {
  if (state.mode !== 'confirmDelete') {
    return state
  }
  return { ...state, mode: 'deleting' }
}

export function deleteSuccess(state: EditorState): EditorState {
  if (state.mode !== 'deleting') {
    return state
  }
  return createEditorState()
}

export function deleteError(state: EditorState): EditorState {
  if (state.mode !== 'deleting') {
    return state
  }
  return { ...state, mode: 'editing' }
}

export function deleteCancel(state: EditorState): EditorState {
  if (state.mode !== 'confirmDelete') {
    return state
  }
  return { ...state, mode: 'editing' }
}

export function discard(state: EditorState): EditorState {
  if (state.mode !== 'confirmDiscard' || !state.pending) {
    return state
  }
  const pending = state.pending
  switch (pending.type) {
    case 'select':
      return applySelect(state, pending.challenge)
    case 'create':
      return applyCreate(state)
    case 'cancel':
      return revertCancel(state)
  }
}

export function keepEditing(state: EditorState): EditorState {
  if (state.mode !== 'confirmDiscard') {
    return state
  }
  return {
    ...state,
    mode: state.challenge ? 'editing' : 'creating',
    pending: null,
  }
}

function patchForm(state: EditorState, form: EditorForm): EditorState {
  if (state.mode !== 'editing' && state.mode !== 'creating') {
    return state
  }
  return { ...state, form }
}

export function updateForm<K extends keyof EditorForm>(
  state: EditorState,
  field: K,
  value: EditorForm[K]
): EditorState {
  return patchForm(state, { ...state.form, [field]: value })
}

export function updateFiles(
  state: EditorState,
  files: EditorForm['files']
): EditorState {
  return patchForm(state, { ...state.form, files })
}

export function updateInstancer(
  state: EditorState,
  instancerConfig: InstancerConfig | null
): EditorState {
  return patchForm(state, { ...state.form, instancerConfig })
}

export function updateAdminBot(
  state: EditorState,
  adminBotConfig: AdminBotConfig
): EditorState {
  return patchForm(state, { ...state.form, adminBotConfig })
}

export function updateScoring(
  state: EditorState,
  scoring: ScoringConfig
): EditorState {
  return patchForm(state, { ...state.form, scoring })
}
