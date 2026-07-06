import { describe, expect, test } from 'bun:test'
import { createDownloadScheduler, type DownloadFile } from './download'

const SPACING = 300

type FakeTimer = { id: number; fn: () => void; at: number }

function makeClock() {
  let seq = 0
  let now = 0
  const timers = new Map<number, FakeTimer>()

  return {
    setTimer(fn: () => void, ms: number): number {
      const id = ++seq
      timers.set(id, { id, fn, at: now + ms })
      return id
    },
    clearTimer(id: number): void {
      timers.delete(id)
    },
    advance(ms: number): void {
      now += ms
      for (;;) {
        const next = [...timers.values()]
          .filter(timer => timer.at <= now)
          .sort((a, b) => a.at - b.at || a.id - b.id)[0]
        if (!next) break
        timers.delete(next.id)
        next.fn()
      }
    },
    get pending() {
      return timers.size
    },
  }
}

function files(...names: string[]): DownloadFile[] {
  return names.map(name => ({ name, url: `https://cdn.example/${name}` }))
}

function setup(failNames: string[] = []) {
  const clock = makeClock()
  const navigated: string[] = []
  const scheduler = createDownloadScheduler({
    spacingMs: SPACING,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    navigate: (file, reportError) => {
      navigated.push(file.name)
      if (failNames.includes(file.name)) reportError()
    },
  })
  return { clock, navigated, scheduler }
}

describe('createDownloadScheduler', () => {
  test.each([
    ['one file', ['a']],
    ['two files', ['a', 'b']],
    ['three files', ['a', 'b', 'c']],
  ])('navigates %s in order, one spacing apart', (_label, names) => {
    const { clock, navigated, scheduler } = setup()
    scheduler.run(files(...names))
    clock.advance(SPACING * (names.length - 1))
    expect(navigated).toEqual(names)
    expect(scheduler.busy).toBe(false)
  })

  test('gates each navigation by the configured spacing', () => {
    const { clock, navigated, scheduler } = setup()
    scheduler.run(files('a', 'b'))
    clock.advance(0)
    expect(navigated).toEqual(['a'])
    clock.advance(SPACING - 1)
    expect(navigated).toEqual(['a'])
    clock.advance(1)
    expect(navigated).toEqual(['a', 'b'])
  })

  test("a second run cancels the first run's remaining queue", () => {
    const { clock, navigated, scheduler } = setup()
    scheduler.run(files('a0', 'a1', 'a2'))
    clock.advance(0)
    expect(navigated).toEqual(['a0'])
    scheduler.run(files('b0', 'b1'))
    clock.advance(SPACING * 2)
    expect(navigated).toEqual(['a0', 'b0', 'b1'])
    expect(clock.pending).toBe(0)
  })

  test('busy stays true until the queue drains, then flips false', () => {
    const { clock, scheduler } = setup()
    let done = 0
    scheduler.run(files('a', 'b'), { onDone: () => (done += 1) })
    expect(scheduler.busy).toBe(true)
    clock.advance(0)
    expect(scheduler.busy).toBe(true)
    expect(done).toBe(0)
    clock.advance(SPACING)
    expect(scheduler.busy).toBe(false)
    expect(done).toBe(1)
  })

  test('superseding keeps busy true and only the new run completes', () => {
    const { clock, scheduler } = setup()
    let doneA = 0
    let doneB = 0
    scheduler.run(files('a0', 'a1', 'a2'), { onDone: () => (doneA += 1) })
    clock.advance(0)
    scheduler.run(files('b0', 'b1'), { onDone: () => (doneB += 1) })
    expect(scheduler.busy).toBe(true)
    clock.advance(SPACING * 2)
    expect(scheduler.busy).toBe(false)
    expect(doneA).toBe(0)
    expect(doneB).toBe(1)
  })

  test('surfaces the failing file name to onError', () => {
    const { clock, navigated, scheduler } = setup(['broken.zip'])
    const errored: string[] = []
    scheduler.run(files('ok.txt', 'broken.zip', 'later.bin'), {
      onError: name => errored.push(name),
    })
    clock.advance(SPACING * 2)
    expect(navigated).toEqual(['ok.txt', 'broken.zip', 'later.bin'])
    expect(errored).toEqual(['broken.zip'])
  })

  test('an error from a superseded run is dropped', () => {
    const { clock, scheduler } = setup(['a1'])
    const errored: string[] = []
    scheduler.run(files('a0', 'a1'), { onError: name => errored.push(name) })
    clock.advance(0)
    scheduler.run(files('b0'), { onError: name => errored.push(name) })
    clock.advance(SPACING)
    expect(errored).toEqual([])
  })

  test('zero files completes immediately without scheduling timers', () => {
    const { clock, navigated, scheduler } = setup()
    let done = 0
    scheduler.run([], { onDone: () => (done += 1) })
    expect(done).toBe(1)
    expect(navigated).toEqual([])
    expect(scheduler.busy).toBe(false)
    expect(clock.pending).toBe(0)
  })
})
