import type { CategoryBarSegment } from '$routes/profile/analytics/analytics-data'
import {
  earnedSegmentEnd,
  separatorIsNeutral,
} from '$routes/profile/analytics/chart-geometry'
import { describe, expect, it } from 'bun:test'

function segment(part: Partial<CategoryBarSegment>): CategoryBarSegment {
  return { key: 'k', label: 'l', value: 0, start: 0, end: 0, ...part }
}

describe('earnedSegmentEnd', () => {
  it('returns 0 when there are no segments', () => {
    expect(earnedSegmentEnd([])).toBe(0)
  })

  it('sums to the earned width across contiguous non-muted segments', () => {
    const segments = [
      segment({ value: 100, start: 0, end: 100 }),
      segment({ value: 50, start: 100, end: 150, hatched: true }),
    ]
    expect(earnedSegmentEnd(segments)).toBe(150)
  })

  it('stops at the last non-muted segment, ignoring trailing muted ones', () => {
    const segments = [
      segment({ value: 100, start: 0, end: 100 }),
      segment({ value: 40, start: 100, end: 140, muted: true }),
    ]
    expect(earnedSegmentEnd(segments)).toBe(100)
  })

  it('returns 0 when every segment is muted', () => {
    const segments = [segment({ value: 100, start: 0, end: 100, muted: true })]
    expect(earnedSegmentEnd(segments)).toBe(0)
  })
})

describe('separatorIsNeutral', () => {
  const segments = [
    segment({ end: 100 }),
    segment({ start: 100, end: 140, muted: true }),
    segment({ start: 140, end: 200 }),
  ]

  it('is neutral when the following segment is muted', () => {
    expect(separatorIsNeutral(segments, 0)).toBe(true)
  })

  it('is neutral when the current segment is muted', () => {
    expect(separatorIsNeutral(segments, 1)).toBe(true)
  })

  it('is category-coloured between two non-muted segments', () => {
    expect(separatorIsNeutral([segments[0]!, segments[2]!], 0)).toBe(false)
  })
})
