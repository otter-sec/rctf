export const TARGET = 'BRAINROT'

const BASE_Z = 100

export type VideoConfig = {
  url: string
  title: string
  x: number
  y: number
  w: number
  h: number
}

export type VideoWindow = VideoConfig & {
  id: number
  z: number
}

export type Drag = {
  id: number
  offsetX: number
  offsetY: number
}

// Thanks https://stimming.club/
export const VIDEO_CONFIGS: VideoConfig[] = [
  {
    url: 'https://www.youtube.com/embed/ChBg4aowzX8',
    title: 'Subway Surfers',
    x: 40,
    y: 80,
    w: 480,
    h: 320,
  },
  {
    url: 'https://www.youtube.com/embed/Q4MOP8s9KyY',
    title: 'Soap Cutting',
    x: 560,
    y: 80,
    w: 480,
    h: 320,
  },
  {
    url: 'https://www.youtube.com/embed/REuKymvrrqk',
    title: 'Minecraft',
    x: 300,
    y: 200,
    w: 640,
    h: 400,
  },
]

export const INITIAL_MAX_Z = BASE_Z
export const ACTIVATED_MAX_Z = BASE_Z + VIDEO_CONFIGS.length

export function advanceBuffer(
  buffer: string,
  key: string,
  targetIsTextField: boolean
): { buffer: string; activated: boolean } {
  if (targetIsTextField) {
    return { buffer, activated: false }
  }

  const char = key.toUpperCase()
  if (char.length !== 1 || !/[A-Z]/.test(char)) {
    return { buffer, activated: false }
  }

  let next = buffer + char
  if (next.length > TARGET.length) {
    next = next.slice(-TARGET.length)
  }

  if (next === TARGET) {
    return { buffer: '', activated: true }
  }
  return { buffer: next, activated: false }
}

export function spawnWindows(): VideoWindow[] {
  return VIDEO_CONFIGS.map((config, i) => ({ id: i, ...config, z: BASE_Z + i }))
}

export function activate(windows: VideoWindow[]): VideoWindow[] {
  return windows.length > 0 ? windows : spawnWindows()
}

export function closeWindow(windows: VideoWindow[], id: number): VideoWindow[] {
  return windows.filter(win => win.id !== id)
}

export function bringToFront(
  windows: VideoWindow[],
  id: number,
  maxZ: number
): { windows: VideoWindow[]; maxZ: number } {
  if (!windows.some(win => win.id === id)) {
    return { windows, maxZ }
  }

  const nextZ = maxZ + 1
  return {
    windows: windows.map(win => (win.id === id ? { ...win, z: nextZ } : win)),
    maxZ: nextZ,
  }
}

export function dragTo(
  windows: VideoWindow[],
  drag: Drag | null,
  clientX: number,
  clientY: number
): VideoWindow[] {
  if (!drag) {
    return windows
  }

  return windows.map(win =>
    win.id === drag.id
      ? { ...win, x: clientX - drag.offsetX, y: clientY - drag.offsetY }
      : win
  )
}
