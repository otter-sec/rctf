/**
 * Pure geometry helpers for the category chart's stacked bars. The point-space
 * accumulation lives in `buildCategoryPointsData`; these read that layout to
 * decide where the category-coloured earned outline ends and whether a
 * separator sits against a muted (unsolved) segment.
 */

import type { CategoryBarSegment } from './analytics-data'

/**
 * The point-space end of the earned region: the largest `end` across the
 * non-muted (solved + dynamic) segments, or 0 when nothing is earned. Since
 * segments accumulate contiguously from 0, this equals the summed earned width.
 */
export function earnedSegmentEnd(segments: CategoryBarSegment[]): number {
  let end = 0
  for (const segment of segments) {
    if (!segment.muted && segment.end > end) end = segment.end
  }
  return end
}

/**
 * Whether the separator after segment `index` borders a muted segment, so it
 * should render in the neutral colour rather than the category colour.
 */
export function separatorIsNeutral(
  segments: CategoryBarSegment[],
  index: number
): boolean {
  return segments[index]?.muted === true || segments[index + 1]?.muted === true
}
