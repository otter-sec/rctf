import type { CategoryBarSegment } from './analytics-data'

export function earnedSegmentEnd(segments: CategoryBarSegment[]): number {
  let end = 0
  for (const segment of segments) {
    if (!segment.muted && segment.end > end) end = segment.end
  }
  return end
}

export function separatorIsNeutral(
  segments: CategoryBarSegment[],
  index: number
): boolean {
  return segments[index]?.muted === true || segments[index + 1]?.muted === true
}
