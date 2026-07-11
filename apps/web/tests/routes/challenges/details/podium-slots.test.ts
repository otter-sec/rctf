import {
  podiumMinColumns,
  resolvePodiumSlots,
  type PodiumEntry,
  type PodiumPlaceholder,
  type PodiumSelf,
  type PodiumSlot,
} from '$routes/challenges/details/podium-slots'
import { describe, expect, test } from 'bun:test'

const entry = (id: string, isSelf = false, detail = ''): PodiumEntry => ({
  userId: id,
  name: id,
  avatarUrl: null,
  detail,
  isSelf,
})

const placeholder: PodiumPlaceholder = {
  name: 'me',
  avatarUrl: null,
  detail: 'Unsolved',
}

const selfAt = (position: number, detail: string): PodiumSelf => ({
  name: 'me',
  avatarUrl: null,
  position,
  detail,
})

describe('resolvePodiumSlots — always four slots', () => {
  test('returns exactly four descriptors', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a')],
      selfEntry: null,
      placeholder: null,
      isAuthenticated: false,
    })
    expect(slots).toHaveLength(4)
  })
})

describe('resolvePodiumSlots — slots 1-3 medal/self variants', () => {
  test('top three take gold/silver/bronze; self overrides the medal', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a', true), entry('b'), entry('c'), entry('d')],
      selfEntry: null,
      placeholder,
      isAuthenticated: true,
    })
    expect(slots[0]).toMatchObject({
      kind: 'entry',
      variant: 'self',
      isSelf: true,
    })
    expect(slots[1]).toMatchObject({
      kind: 'entry',
      variant: 'silver',
      isSelf: false,
    })
    expect(slots[2]).toMatchObject({
      kind: 'entry',
      variant: 'bronze',
      isSelf: false,
    })
  })

  test('ordinals label positions 1st/2nd/3rd', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c')],
      selfEntry: null,
      placeholder: null,
      isAuthenticated: false,
    })
    expect(slots[0]?.ordinal).toBe('1st')
    expect(slots[1]?.ordinal).toBe('2nd')
    expect(slots[2]?.ordinal).toBe('3rd')
  })
})

describe('resolvePodiumSlots — slot 4 branch A (4th entry)', () => {
  test('user in top 3 shows the 4th solver as a plain entry', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a', true), entry('b'), entry('c'), entry('d')],
      selfEntry: selfAt(4, 'SELF'),
      placeholder,
      isAuthenticated: true,
    })
    expect(slots[3]).toMatchObject({
      kind: 'entry',
      name: 'd',
      ordinal: '4th',
      variant: 'nth',
      isSelf: false,
    })
  })

  test('logged out shows the 4th solver as a plain entry', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c'), entry('d')],
      selfEntry: null,
      placeholder: null,
      isAuthenticated: false,
    })
    expect(slots[0]?.variant).toBe('gold')
    expect(slots[3]).toMatchObject({ kind: 'entry', name: 'd', isSelf: false })
  })

  test('logged out with only three solvers leaves slot 4 empty', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c')],
      selfEntry: null,
      placeholder: null,
      isAuthenticated: false,
    })
    expect(slots[3]).toMatchObject({ kind: 'empty', name: '', ordinal: '' })
  })
})

describe('resolvePodiumSlots — slot 4 branch B (self slot)', () => {
  test('solved outside the top 3 shows a self slot with own ordinal', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c')],
      selfEntry: selfAt(12, '+5m'),
      placeholder,
      isAuthenticated: true,
    })
    expect(slots[3]).toMatchObject({
      kind: 'self',
      variant: 'self',
      ordinal: '12th',
      name: 'me',
      detail: '+5m',
      isSelf: true,
    })
  })
})

describe('resolvePodiumSlots — slot 4 branch C (placeholder)', () => {
  test('unsolved authenticated user shows the You/Unsolved placeholder', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c')],
      selfEntry: null,
      placeholder,
      isAuthenticated: true,
    })
    expect(slots[3]).toMatchObject({
      kind: 'placeholder',
      variant: 'nth',
      ordinal: 'You',
      name: 'me',
      detail: 'Unsolved',
      isSelf: true,
    })
  })

  test('authenticated non-solver never sees the literal 4th solver', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c'), entry('d')],
      selfEntry: null,
      placeholder,
      isAuthenticated: true,
    })
    expect(slots[3]?.kind).toBe('placeholder')
    expect(slots.some(slot => slot.name === 'd')).toBe(false)
  })
})

describe('resolvePodiumSlots — self-is-4th dedupe', () => {
  test('when the current user is the 4th solver, render one self slot, not an entry', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b'), entry('c'), entry('me', true, 'ENTRY')],
      selfEntry: selfAt(4, 'SELF'),
      placeholder,
      isAuthenticated: true,
    })
    expect(slots[3]).toMatchObject({
      kind: 'self',
      variant: 'self',
      ordinal: '4th',
      detail: 'SELF',
      isSelf: true,
    })
    expect(slots.filter(slot => slot.isSelf)).toHaveLength(1)
    expect(slots.some(slot => slot.detail === 'ENTRY')).toBe(false)
  })
})

describe('resolvePodiumSlots — fewer solvers leave empty dashed slots', () => {
  test('two solvers leave slots 3 and 4 empty', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a'), entry('b')],
      selfEntry: null,
      placeholder: null,
      isAuthenticated: false,
    })
    expect(slots[0]?.kind).toBe('entry')
    expect(slots[1]?.kind).toBe('entry')
    expect(slots[2]).toMatchObject({ kind: 'empty', name: '' })
    expect(slots[3]).toMatchObject({ kind: 'empty', name: '' })
  })

  test('one solver leaves slots 2, 3 and 4 empty', () => {
    const slots = resolvePodiumSlots({
      top: [entry('a')],
      selfEntry: null,
      placeholder: null,
      isAuthenticated: false,
    })
    expect(slots[0]?.kind).toBe('entry')
    expect(slots[1]?.kind).toBe('empty')
    expect(slots[2]?.kind).toBe('empty')
    expect(slots[3]?.kind).toBe('empty')
  })

  test('no solvers leaves every slot empty', () => {
    const slots = resolvePodiumSlots({
      top: [],
      selfEntry: null,
      placeholder: null,
      isAuthenticated: false,
    })
    expect(slots.every(slot => slot.kind === 'empty')).toBe(true)
  })
})

describe('podiumMinColumns — collapse keeps self and top ranks visible', () => {
  const slotsWithSelf = (selfIndex: number): PodiumSlot[] =>
    [0, 1, 2, 3].map(index => ({
      kind: 'entry',
      variant: 'nth',
      ordinal: '',
      name: '',
      avatarUrl: null,
      detail: '',
      isSelf: index === selfIndex,
    }))

  test('no self slot keeps the first-place slot longest', () => {
    expect(podiumMinColumns(slotsWithSelf(-1))).toEqual([1, 2, 3, 4])
  })

  test('self in slot 4 stays pinned; the rest hide highest-index-first', () => {
    expect(podiumMinColumns(slotsWithSelf(3))).toEqual([2, 3, 4, 1])
  })

  test('self in slot 2 stays pinned regardless of rank', () => {
    expect(podiumMinColumns(slotsWithSelf(1))).toEqual([2, 1, 3, 4])
  })
})
