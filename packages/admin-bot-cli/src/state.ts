import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { normalizeInputHistory } from './history'

const STATE_FILE = 'state.json'

export interface InputHistory {
  localTarget: string[]
  inputs: Record<string, string[]>
}

export interface CliState {
  inputHistory: InputHistory
  hostNetworkSuccessAt?: number
}

const emptyInputHistory = (): InputHistory => ({
  localTarget: [],
  inputs: {},
})

const emptyState = (): CliState => ({ inputHistory: emptyInputHistory() })

const statePath = (dataDir: string): string => join(dataDir, STATE_FILE)

const normalizeInputHistories = (value: unknown): InputHistory => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return emptyInputHistory()
  }

  const history = value as {
    localTarget?: unknown
    inputs?: unknown
  }
  const inputs =
    history.inputs !== null &&
    typeof history.inputs === 'object' &&
    !Array.isArray(history.inputs)
      ? Object.fromEntries(
          Object.entries(history.inputs).flatMap(([name, values]) =>
            Array.isArray(values)
              ? [[name, normalizeInputHistory(values)] as const]
              : []
          )
        )
      : {}

  return {
    localTarget: Array.isArray(history.localTarget)
      ? normalizeInputHistory(history.localTarget)
      : [],
    inputs,
  }
}

const normalizeState = (value: unknown): CliState => {
  if (value === null || typeof value !== 'object') {
    return emptyState()
  }

  const state = value as {
    inputHistory?: unknown
    hostNetworkSuccessAt?: unknown
  }
  return {
    inputHistory: normalizeInputHistories(state.inputHistory),
    ...(typeof state.hostNetworkSuccessAt === 'number' &&
    Number.isFinite(state.hostNetworkSuccessAt)
      ? { hostNetworkSuccessAt: state.hostNetworkSuccessAt }
      : {}),
  }
}

export const loadCliState = async (dataDir: string): Promise<CliState> => {
  try {
    return normalizeState(
      JSON.parse(await readFile(statePath(dataDir), 'utf8'))
    )
  } catch {
    return emptyState()
  }
}

const saveCliState = async (dataDir: string, state: unknown): Promise<void> => {
  const path = statePath(dataDir)
  const contents = `${JSON.stringify(normalizeState(state), null, 2)}\n`

  await mkdir(dataDir, { recursive: true })
  const temporaryPath = `${path}.${process.pid}.tmp`
  await writeFile(temporaryPath, contents, { mode: 0o600 })
  await rename(temporaryPath, path)
}

export const updateCliState = async (
  dataDir: string,
  update: (state: CliState) => CliState
): Promise<void> => {
  await saveCliState(dataDir, update(await loadCliState(dataDir)))
}

export const loadInputHistory = async (
  dataDir: string
): Promise<InputHistory> => (await loadCliState(dataDir)).inputHistory

export const saveInputHistory = async (
  dataDir: string,
  inputHistory: InputHistory
): Promise<void> => {
  await updateCliState(dataDir, state => ({
    ...state,
    inputHistory: normalizeInputHistories(inputHistory),
  }))
}
