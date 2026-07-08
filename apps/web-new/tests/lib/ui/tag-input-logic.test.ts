import { addTag, removeLastTag, removeTag } from '$lib/ui/tag-input-logic'
import { describe, expect, it } from 'bun:test'

describe('addTag', () => {
  it('trims and appends', () => {
    const result = addTag(['a'], '  b  ')
    expect(result).toEqual({ kind: 'added', value: ['a', 'b'] })
  })

  it('treats a whitespace-only entry as empty', () => {
    expect(addTag(['a'], '   ')).toEqual({ kind: 'empty' })
  })

  it('keeps duplicates (matches old no-dedup behavior)', () => {
    const result = addTag(['a'], 'a')
    expect(result).toEqual({ kind: 'added', value: ['a', 'a'] })
  })

  it('rejects when validate fails and leaves value unchanged', () => {
    const value = ['a']
    const result = addTag(value, 'bad', entry => entry === 'good')
    expect(result).toEqual({ kind: 'rejected' })
    expect(value).toEqual(['a'])
  })

  it('appends when validate passes', () => {
    const result = addTag([], 'good', entry => entry === 'good')
    expect(result).toEqual({ kind: 'added', value: ['good'] })
  })

  it('validates the trimmed entry, not the raw input', () => {
    const result = addTag([], '  good  ', entry => entry === 'good')
    expect(result).toEqual({ kind: 'added', value: ['good'] })
  })

  it('does not mutate the input array', () => {
    const value = ['a']
    addTag(value, 'b')
    expect(value).toEqual(['a'])
  })
})

describe('removeTag', () => {
  it('removes the entry at the given index', () => {
    expect(removeTag(['a', 'b', 'c'], 1)).toEqual(['a', 'c'])
  })

  it('leaves the value unchanged for an out-of-range index', () => {
    expect(removeTag(['a', 'b'], 5)).toEqual(['a', 'b'])
  })
})

describe('removeLastTag', () => {
  it('removes the last entry', () => {
    expect(removeLastTag(['a', 'b'])).toEqual(['a'])
  })

  it('is a no-op on an empty array', () => {
    expect(removeLastTag([])).toEqual([])
  })
})
