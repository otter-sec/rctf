import { describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { InputHistoryNavigator, mergeInputHistory } from '../src/history'
import {
  loadCliState,
  loadInputHistory,
  saveInputHistory,
  updateCliState,
} from '../src/state'

describe('InputHistoryNavigator', () => {
  test('moves backward and forward while preserving the draft', () => {
    const history = new InputHistoryNavigator(['second', 'first'])

    expect(history.previous('draft')).toBe('second')
    expect(history.previous('second')).toBe('first')
    expect(history.previous('first')).toBe('first')
    expect(history.next('first')).toBe('second')
    expect(history.next('second')).toBe('draft')
    expect(history.next('draft')).toBe('draft')
  })
})

describe('input history persistence', () => {
  test('stores deduplicated histories separately by field', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-history-'))
    const history = {
      localTarget: ['http://localhost:8080'],
      inputs: {
        url: mergeInputHistory(['older-url', 'reused'], ['new-url', 'reused']),
        note: ['hello'],
      },
    }

    expect(history.inputs.url?.slice(0, 3)).toEqual([
      'reused',
      'new-url',
      'older-url',
    ])
    await saveInputHistory(directory, history)
    expect(await loadInputHistory(directory)).toEqual(history)

    const stored = JSON.parse(
      await readFile(join(directory, 'state.json'), 'utf8')
    )
    expect(stored.inputHistory).toEqual(history)
    if (process.platform !== 'win32') {
      expect((await stat(join(directory, 'state.json'))).mode & 0o777).toBe(
        0o600
      )
    }
  })

  test('ignores missing or invalid history files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-history-'))
    expect(await loadInputHistory(directory)).toEqual({
      localTarget: [],
      inputs: {},
    })
  })

  test('does not load the old global history format', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-history-'))
    await writeFile(
      join(directory, 'state.json'),
      JSON.stringify({ inputHistory: ['old-global-value'] })
    )

    expect(await loadInputHistory(directory)).toEqual({
      localTarget: [],
      inputs: {},
    })
  })

  test('preserves the host-network cache when saving history', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-history-'))
    await updateCliState(directory, state => ({
      ...state,
      hostNetworkSuccessAt: 1234,
    }))

    await saveInputHistory(directory, {
      localTarget: ['https://localhost:8080/'],
      inputs: { url: ['https://example.com/'] },
    })
    expect(await loadCliState(directory)).toEqual({
      inputHistory: {
        localTarget: ['https://localhost:8080/'],
        inputs: { url: ['https://example.com/'] },
      },
      hostNetworkSuccessAt: 1234,
    })
  })
})
