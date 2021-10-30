import type { NavigateFunction } from 'react-router-dom'

export const navigateRef = { current: null as unknown as NavigateFunction }

export const route = (path: string, replace = false) => {
  navigateRef.current(path, { replace })
}
