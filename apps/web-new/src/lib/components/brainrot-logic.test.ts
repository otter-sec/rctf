import { describe, expect, test } from 'bun:test'
import {
  activate,
  ACTIVATED_MAX_Z,
  advanceBuffer,
  bringToFront,
  closeWindow,
  dragTo,
  spawnWindows,
  TARGET,
  VIDEO_CONFIGS,
} from './brainrot-logic'

describe('advanceBuffer', () => {
  test('appends a single uppercased letter', () => {
    expect(advanceBuffer('BRAIN', 'r', false)).toEqual({
      buffer: 'BRAINR',
      activated: false,
    })
  })

  test('ignores multi-character keys like Enter or Shift', () => {
    expect(advanceBuffer('BR', 'Enter', false)).toEqual({
      buffer: 'BR',
      activated: false,
    })
    expect(advanceBuffer('BR', 'Shift', false)).toEqual({
      buffer: 'BR',
      activated: false,
    })
  })

  test('ignores non-letter single characters like digits and punctuation', () => {
    expect(advanceBuffer('BR', '1', false)).toEqual({
      buffer: 'BR',
      activated: false,
    })
    expect(advanceBuffer('BR', '-', false)).toEqual({
      buffer: 'BR',
      activated: false,
    })
  })

  test('ignores every key when the target is a text field', () => {
    expect(advanceBuffer('BRAINRO', 'T', true)).toEqual({
      buffer: 'BRAINRO',
      activated: false,
    })
  })

  test('caps the rolling buffer to the target length', () => {
    const result = advanceBuffer('ZZZZZZZZ', 'X', false)
    expect(result.buffer).toBe('ZZZZZZZX')
    expect(result.buffer.length).toBe(TARGET.length)
  })

  test('activates on an exact match and resets the buffer', () => {
    expect(advanceBuffer('BRAINRO', 'T', false)).toEqual({
      buffer: '',
      activated: true,
    })
  })

  test('activates via the rolling window even with leading noise', () => {
    // Prefix noise slides off once the buffer exceeds the target length.
    const result = advanceBuffer('XXBRAINRO', 'T', false)
    expect(result).toEqual({ buffer: '', activated: true })
  })
})

describe('spawnWindows', () => {
  test('maps every config with sequential ids and stacked z', () => {
    const windows = spawnWindows()
    expect(windows).toHaveLength(VIDEO_CONFIGS.length)
    windows.forEach((win, i) => {
      expect(win.id).toBe(i)
      expect(win.z).toBe(100 + i)
      expect(win.title).toBe(VIDEO_CONFIGS[i]!.title)
      expect(win.url).toBe(VIDEO_CONFIGS[i]!.url)
    })
  })
})

describe('activate', () => {
  test('spawns a fresh set when no windows exist', () => {
    expect(activate([])).toHaveLength(VIDEO_CONFIGS.length)
  })

  test('no-ops while windows already exist', () => {
    const existing = spawnWindows()
    expect(activate(existing)).toBe(existing)
  })
})

describe('closeWindow', () => {
  test('removes the window matching the id', () => {
    const windows = spawnWindows()
    const result = closeWindow(windows, 1)
    expect(result.map(w => w.id)).toEqual([0, 2])
  })

  test('leaves the set unchanged for an unknown id', () => {
    const windows = spawnWindows()
    expect(closeWindow(windows, 99)).toHaveLength(windows.length)
  })
})

describe('bringToFront', () => {
  test('strictly increases z above the current max', () => {
    const windows = spawnWindows()
    const result = bringToFront(windows, 0, ACTIVATED_MAX_Z)
    expect(result.maxZ).toBe(ACTIVATED_MAX_Z + 1)
    expect(result.windows.find(w => w.id === 0)!.z).toBe(ACTIVATED_MAX_Z + 1)
  })

  test('no-ops for an unknown id', () => {
    const windows = spawnWindows()
    const result = bringToFront(windows, 99, ACTIVATED_MAX_Z)
    expect(result.windows).toBe(windows)
    expect(result.maxZ).toBe(ACTIVATED_MAX_Z)
  })
})

describe('dragTo', () => {
  test('applies the pointer offset to the dragged window only', () => {
    const windows = spawnWindows()
    const drag = { id: 2, offsetX: 10, offsetY: 20 }
    const result = dragTo(windows, drag, 300, 400)
    const moved = result.find(w => w.id === 2)!
    expect(moved.x).toBe(290)
    expect(moved.y).toBe(380)
    expect(result.find(w => w.id === 0)).toEqual(windows[0]!)
  })

  test('returns the set unchanged when no drag is active', () => {
    const windows = spawnWindows()
    expect(dragTo(windows, null, 10, 10)).toBe(windows)
  })
})
