import { untrack } from 'svelte'
import { CELL_KIND, resolveCellTooltip, type CellTooltip } from './cell-tooltip'
import { createTooltipTiming, resolveHoverTarget } from './hover-state'

const SCROLL_IDLE_MS = 150

export interface HoverControllerDeps {
  scrollRoot: () => HTMLElement | null
  entries: () => unknown
  startTime: () => number
}

export interface SolveHighlight {
  teamId: string
  time: number
}

export function createHoverController(deps: HoverControllerDeps) {
  let hoveredColumnId = $state<string | null>(null)
  let hoveredRowId = $state<string | null>(null)
  let hoveredTeamId = $state<string | null>(null)
  let solveHighlight = $state<SolveHighlight | null>(null)

  let activeTooltip = $state<CellTooltip | null>(null)
  let tooltipX = $state(0)
  let tooltipY = $state(0)
  let tooltipPlace = $state<'top' | 'bottom'>('top')

  const tooltipTiming = createTooltipTiming<Element>({
    openDelayMs: 400,
    cooldownMs: 300,
    setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimer: id => window.clearTimeout(id),
  })
  $effect(() => () => tooltipTiming.dispose())

  let lastPointer: { x: number; y: number } | null = null

  let scrolling = $state(false)

  $effect(() => {
    const root = deps.scrollRoot()
    if (!root) return

    let idleTimer: number | undefined
    let frame: number | undefined

    const handleScroll = () => {
      scrolling = true
      if (frame === undefined) {
        frame = requestAnimationFrame(() => {
          frame = undefined
          refreshHoverFromPoint()
        })
      }
      if (idleTimer !== undefined) window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => {
        idleTimer = undefined
        scrolling = false
        refreshHoverFromPoint()
      }, SCROLL_IDLE_MS)
    }

    root.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      root.removeEventListener('scroll', handleScroll)
      if (idleTimer !== undefined) window.clearTimeout(idleTimer)
      if (frame !== undefined) cancelAnimationFrame(frame)
      scrolling = false
    }
  })

  const displayedTooltip = $derived(scrolling ? null : activeTooltip)

  function clearTooltip() {
    tooltipTiming.clear()
    activeTooltip = null
  }

  function clearHover() {
    clearTooltip()
    hoveredTeamId = null
    solveHighlight = null
    hoveredColumnId = null
    hoveredRowId = null
  }

  function handlePointerMove(event: PointerEvent) {
    lastPointer = { x: event.clientX, y: event.clientY }
    updateHover(event.target instanceof Element ? event.target : null)
  }

  function handlePointerLeave() {
    lastPointer = null
    clearHover()
  }

  function refreshHoverFromPoint() {
    if (!lastPointer) return
    const el = document.elementFromPoint(lastPointer.x, lastPointer.y)
    updateHover(el && deps.scrollRoot()?.contains(el) ? el : null)
  }

  function updateHover(target: Element | null) {
    const row = target?.closest<HTMLElement>('[data-team-id]') ?? null
    const cell = target?.closest<HTMLElement>('[data-tooltip-cell]') ?? null

    const teamId = row?.dataset.teamId ?? null
    const hoverPatch = resolveHoverTarget({
      teamId,
      hasCell: !!cell,
      columnId: target?.closest<HTMLElement>('[data-col]')?.dataset.col ?? null,
      overRowTeam: !!target?.closest('row-team'),
    })
    if (hoverPatch.columnId !== undefined) hoveredColumnId = hoverPatch.columnId
    if (hoverPatch.rowId !== undefined) hoveredRowId = hoverPatch.rowId
    if (hoverPatch.teamId !== undefined) hoveredTeamId = hoverPatch.teamId
    if (hoverPatch.solveHighlight !== undefined) solveHighlight = null

    if (cell && (scrolling || !tooltipTiming.isCurrent(cell))) {
      hoveredTeamId = null
      solveHighlight = null
    }

    if (scrolling || !cell) {
      clearTooltip()
      return
    }
    if (tooltipTiming.isCurrent(cell)) return
    const resolved = resolveCellTooltip(cell.dataset, deps.startTime())
    if (!resolved) {
      clearTooltip()
      return
    }
    const kind = cell.dataset.kind
    const isHeader =
      kind === CELL_KIND.headerChallenge || kind === CELL_KIND.headerCategory
    const show = () => {
      const rect = cell.getBoundingClientRect()
      activeTooltip = resolved
      tooltipX = rect.left + rect.width / 2
      tooltipY = isHeader ? rect.bottom : rect.top
      tooltipPlace = isHeader ? 'bottom' : 'top'
      hoveredTeamId = teamId
      solveHighlight =
        teamId && kind === CELL_KIND.challenge && cell.dataset.solveTime
          ? { teamId, time: Number(cell.dataset.solveTime) }
          : null
    }
    if (tooltipTiming.pointerOverCell(cell, isHeader, show) === 'scheduled') {
      activeTooltip = null
    }
  }

  $effect(() => {
    void deps.entries()
    untrack(() => {
      clearHover()
      refreshHoverFromPoint()
    })
  })

  return {
    get hoveredColumnId() {
      return hoveredColumnId
    },
    get hoveredRowId() {
      return hoveredRowId
    },
    get hoveredTeamId() {
      return hoveredTeamId
    },
    get solveHighlight() {
      return solveHighlight
    },
    get tooltip() {
      return displayedTooltip
    },
    get tooltipX() {
      return tooltipX
    },
    get tooltipY() {
      return tooltipY
    },
    get tooltipPlace() {
      return tooltipPlace
    },
    handlePointerMove,
    handlePointerLeave,
  }
}
