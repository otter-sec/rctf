import { timingSafeEqual } from '../../util/timing-safe-equal'

export const verifyDefaultFlag = (flag: string, submitted: string): boolean => {
  return timingSafeEqual(flag, submitted)
}
