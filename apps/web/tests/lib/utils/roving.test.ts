import { moveRovingIndex } from '$lib/utils/roving'
import { describe, expect, test } from 'bun:test'

describe('moveRovingIndex', () => {
  test('ArrowRight advances and wraps past the end', () => {
    expect(moveRovingIndex(0, 4, 'ArrowRight')).toBe(1)
    expect(moveRovingIndex(3, 4, 'ArrowRight')).toBe(0)
  })

  test('ArrowLeft retreats and wraps past the start', () => {
    expect(moveRovingIndex(2, 4, 'ArrowLeft')).toBe(1)
    expect(moveRovingIndex(0, 4, 'ArrowLeft')).toBe(3)
  })

  test('Home and End jump to the edges', () => {
    expect(moveRovingIndex(2, 4, 'Home')).toBe(0)
    expect(moveRovingIndex(1, 4, 'End')).toBe(3)
  })

  test('single-item toolbar stays put', () => {
    expect(moveRovingIndex(0, 1, 'ArrowRight')).toBe(0)
    expect(moveRovingIndex(0, 1, 'ArrowLeft')).toBe(0)
  })

  test('unhandled keys and empty toolbars yield null', () => {
    expect(moveRovingIndex(0, 4, 'Enter')).toBeNull()
    expect(moveRovingIndex(0, 4, 'a')).toBeNull()
    expect(moveRovingIndex(0, 0, 'ArrowRight')).toBeNull()
    expect(moveRovingIndex(0, 0, 'Home')).toBeNull()
  })

  test('rtl swaps ArrowLeft and ArrowRight, leaves Home/End untouched', () => {
    expect(moveRovingIndex(0, 4, 'ArrowLeft', true)).toBe(1)
    expect(moveRovingIndex(3, 4, 'ArrowLeft', true)).toBe(0)
    expect(moveRovingIndex(2, 4, 'ArrowRight', true)).toBe(1)
    expect(moveRovingIndex(0, 4, 'ArrowRight', true)).toBe(3)
    expect(moveRovingIndex(2, 4, 'Home', true)).toBe(0)
    expect(moveRovingIndex(1, 4, 'End', true)).toBe(3)
  })
})
