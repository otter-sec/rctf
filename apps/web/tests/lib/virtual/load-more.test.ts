import { evaluateLoadMore, type LoadMoreInput } from '$lib/virtual/load-more'
import { describe, expect, test } from 'bun:test'

const base: LoadMoreInput = {
  lastVisibleIndex: 95,
  loadedCount: 100,
  prefetchRows: 10,
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

  test('re-fires as soon as the fetch settles with the viewport still parked past the threshold', () => {
    const settled = { ...base, isFetching: false, latched: true }
    expect(evaluateLoadMore(settled)).toEqual({
      shouldFetch: true,
      latched: true,
    })
  })

  test('releases the latch without firing when the viewport left the threshold', () => {
    const settled = {
      ...base,
      lastVisibleIndex: 50,
      isFetching: false,
      latched: true,
    }
    expect(evaluateLoadMore(settled)).toEqual({
      shouldFetch: false,
      latched: false,
    })
  })

  test('completes a full fire → fetch → land → re-fire cycle', () => {
    let state = { ...base }
    const fire = evaluateLoadMore(state)
    expect(fire.shouldFetch).toBe(true)

    state = { ...state, isFetching: true, latched: fire.latched }
    expect(evaluateLoadMore(state).shouldFetch).toBe(false)

    state = {
      ...state,
      isFetching: false,
      loadedCount: 200,
      lastVisibleIndex: 195,
    }
    expect(evaluateLoadMore(state)).toEqual({
      shouldFetch: true,
      latched: true,
    })
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

  test('fires when fewer rows than the prefetch window are loaded', () => {
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

  test('can keep multiple pages buffered ahead of the visible range', () => {
    const buffered = {
      ...base,
      loadedCount: 500,
      prefetchRows: 300,
    }

    expect(
      evaluateLoadMore({ ...buffered, lastVisibleIndex: 200 }).shouldFetch
    ).toBe(true)
    expect(
      evaluateLoadMore({ ...buffered, lastVisibleIndex: 199 }).shouldFetch
    ).toBe(false)
  })
})
