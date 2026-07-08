import { evaluateLoadMore, type LoadMoreInput } from '$lib/virtual/load-more'
import { describe, expect, test } from 'bun:test'

const base: LoadMoreInput = {
  lastVisibleIndex: 95,
  loadedCount: 100,
  overscan: 10,
  hasNextPage: true,
  isFetching: false,
  latched: false,
}

describe('evaluateLoadMore', () => {
  test('fires once when the range crosses the threshold', () => {
    const result = evaluateLoadMore(base)
    expect(result).toEqual({ shouldFetch: true, latched: true })
  })

  test('does not fire again while the triggered fetch is in flight', () => {
    const fetching = { ...base, isFetching: true, latched: true }
    expect(evaluateLoadMore(fetching)).toEqual({
      shouldFetch: false,
      latched: true,
    })
    expect(evaluateLoadMore(fetching)).toEqual({
      shouldFetch: false,
      latched: true,
    })
  })

  test('re-arms only after isFetching falls', () => {
    const settling = { ...base, isFetching: false, latched: true }
    expect(evaluateLoadMore(settling)).toEqual({
      shouldFetch: false,
      latched: false,
    })
  })

  test('completes a full fire → fetch → settle → re-fire cycle', () => {
    let state = { ...base }
    const fire = evaluateLoadMore(state)
    expect(fire.shouldFetch).toBe(true)

    state = { ...state, isFetching: true, latched: fire.latched }
    expect(evaluateLoadMore(state).shouldFetch).toBe(false)

    state = { ...state, isFetching: false, latched: true }
    const settle = evaluateLoadMore(state)
    expect(settle).toEqual({ shouldFetch: false, latched: false })

    state = {
      ...state,
      loadedCount: 200,
      lastVisibleIndex: 195,
      latched: false,
    }
    expect(evaluateLoadMore(state).shouldFetch).toBe(true)
  })

  test('never fires when there is no next page', () => {
    expect(evaluateLoadMore({ ...base, hasNextPage: false })).toEqual({
      shouldFetch: false,
      latched: false,
    })
  })

  test('never fires while already fetching, even unlatched', () => {
    expect(evaluateLoadMore({ ...base, isFetching: true })).toEqual({
      shouldFetch: false,
      latched: false,
    })
  })

  test('does not fire below the threshold', () => {
    expect(evaluateLoadMore({ ...base, lastVisibleIndex: 50 })).toEqual({
      shouldFetch: false,
      latched: false,
    })
  })

  test('does not fire when nothing is loaded yet', () => {
    expect(
      evaluateLoadMore({ ...base, loadedCount: 0, lastVisibleIndex: 0 })
    ).toEqual({ shouldFetch: false, latched: false })
  })

  test('fires when fewer rows than the overscan are loaded', () => {
    expect(
      evaluateLoadMore({ ...base, loadedCount: 5, lastVisibleIndex: 4 })
    ).toEqual({ shouldFetch: true, latched: true })
  })

  test('fires exactly at the threshold boundary', () => {
    expect(
      evaluateLoadMore({ ...base, loadedCount: 100, lastVisibleIndex: 90 })
    ).toEqual({ shouldFetch: true, latched: true })
  })

  test('does not fire one row before the threshold boundary', () => {
    expect(
      evaluateLoadMore({ ...base, loadedCount: 100, lastVisibleIndex: 89 })
    ).toEqual({ shouldFetch: false, latched: false })
  })
})
