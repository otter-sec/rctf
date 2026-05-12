import { useInfiniteVirtualScroll, type ScrollMetrics } from '$lib/utils'
import { onMount } from 'svelte'
import { getEmptyGraphVisibility, getGraphVisibility } from './scores-data-helpers'
import type {
  CurrentUserScoreData,
  GraphVisibility,
  ScoreEntry,
  ScoreGraphEntry,
  ViewportVisibility,
} from './types'

const ROW_GAP = 4
const ROW_HEIGHT = 64 + ROW_GAP
const CELL_WIDTH = 48
const DIAGONAL_OVERFLOW = 96

interface ScoresViewportStateConfig {
  entries: () => ScoreEntry[]
  total: () => number
  isLoading: () => boolean
  search: () => string | undefined
  focusedChallengeId: () => string | null
  currentUser: () => CurrentUserScoreData | null | undefined
  showTop3Context: () => boolean
  showSelfContext: () => boolean
  cellCount: () => number
  allGraphData: () => ScoreGraphEntry[]
  teamRanks: () => Map<string, number>
  hasNextPage: () => boolean
  isFetchingNextPage: () => boolean
  fetchNextPage: () => void
  onScroll?: () => void
}

export function createScoresViewportState(config: ScoresViewportStateConfig) {
  let themeRenderEpoch = $state(0)
  let isDesktop = $state(true)
  let isXl = $state(true)
  let listScrollMargin = $state(0)
  let showTopFade = $state(false)
  let showBottomFade = $state(false)
  let showLeftFade = $state(false)
  let showRightFade = $state(false)
  let scrollMetrics = $state<ScrollMetrics | null>(null)
  let headerRowRef = $state<HTMLElement | null>(null)
  let fadeRaf = 0

  onMount(() => {
    const mqlDesktop = window.matchMedia('(min-width: 768px)')
    const mqlXl = window.matchMedia('(min-width: 1280px)')
    const root = document.documentElement

    const updateDesktop = () => (isDesktop = mqlDesktop.matches)
    const updateXl = () => (isXl = mqlXl.matches)

    updateDesktop()
    updateXl()

    mqlDesktop.addEventListener('change', updateDesktop)
    mqlXl.addEventListener('change', updateXl)

    const themeObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          themeRenderEpoch = Date.now()
          break
        }
      }
    })
    themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      mqlDesktop.removeEventListener('change', updateDesktop)
      mqlXl.removeEventListener('change', updateXl)
      themeObserver.disconnect()
    }
  })

  function updateFades(metrics: ScrollMetrics) {
    config.onScroll?.()
    scrollMetrics = metrics
    const threshold = 10
    const nextTop = metrics.scrollTop > threshold
    const nextBottom = metrics.scrollTop + metrics.clientHeight < metrics.scrollHeight - threshold
    const nextLeft = metrics.scrollLeft > threshold
    const nextRight = metrics.scrollLeft + metrics.clientWidth < metrics.scrollWidth - threshold

    if (showTopFade !== nextTop) showTopFade = nextTop
    if (showBottomFade !== nextBottom) showBottomFade = nextBottom
    if (showLeftFade !== nextLeft) showLeftFade = nextLeft
    if (showRightFade !== nextRight) showRightFade = nextRight
  }

  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 10,
    isScrollingResetDelay: 100,
    onLoadMore: config.fetchNextPage,
    onScroll: updateFades,
  })

  const userEntryIndex = $derived.by(() => {
    const currentUser = config.currentUser()
    return currentUser ? config.entries().findIndex(entry => entry.id === currentUser.id) : -1
  })

  const viewportVisibility = $derived(getViewportVisibility(
    scrollMetrics,
    scroll.virtualItems,
    config.entries(),
    listScrollMargin,
    userEntryIndex
  ))

  const showSelfRow = $derived.by(() => {
    if (config.search()) return false
    if (config.isLoading() && config.currentUser()) return true
    if (!config.currentUser()?.globalPlace) return false
    if (viewportVisibility.userVisible) return false
    return true
  })

  const selfRowPosition = $derived.by((): 'top' | 'bottom' => {
    const currentUser = config.currentUser()
    if (!currentUser?.globalPlace) return 'bottom'
    if (userEntryIndex === -1) return 'bottom'
    if (viewportVisibility.userClippedTop) return 'top'
    const userItem = scroll.virtualItems.find(item => item.index === userEntryIndex)
    if (!userItem) {
      return viewportVisibility.minRank > userEntryIndex + 1 ? 'top' : 'bottom'
    }
    return 'bottom'
  })

  const contentWidth = $derived(config.cellCount() * (CELL_WIDTH + ROW_GAP) + DIAGONAL_OVERFLOW)
  const graphVisibility = $derived(getGraphVisibility({
    entries: config.entries(),
    isLoading: config.isLoading(),
    minRank: viewportVisibility.minRank,
    maxRank: viewportVisibility.maxRank,
    focusedChallengeId: config.focusedChallengeId(),
    showTop3Context: config.showTop3Context(),
    showSelfContext: config.showSelfContext(),
    currentUserId: config.currentUser()?.id ?? null,
    teamRanks: config.teamRanks(),
  }))
  let stableGraphVisibility = $state<GraphVisibility>(getEmptyGraphVisibility())

  $effect(() => {
    if (!scroll.isScrolling) stableGraphVisibility = graphVisibility
  })

  const visibleGraphData = $derived(
    config.allGraphData().filter(team => stableGraphVisibility.visibleTeamIds.has(team.id))
  )
  const contextTeamIds = $derived(stableGraphVisibility.contextTeamIds)
  const scrollbarYPadding = $derived(getScrollbarYPadding(showSelfRow, selfRowPosition, isDesktop))
  const fadeDeps = $derived({
    contentWidth,
    listScrollMargin,
    showSelfRow,
    selfRowPosition,
    isDesktop,
    isLoading: config.isLoading(),
    focusedChallengeId: config.focusedChallengeId(),
    entryCount: config.entries().length,
  })

  $effect(() => {
    const header = headerRowRef
    if (!header) {
      listScrollMargin = 0
      return
    }

    const ro = new ResizeObserver(entries => {
      const height = entries[0]?.contentRect.height ?? 0
      listScrollMargin = Math.round(height)
    })
    ro.observe(header)
    listScrollMargin = Math.round(header.getBoundingClientRect().height)

    return () => ro.disconnect()
  })

  $effect(() => {
    const viewport = scroll.state.viewportRef
    if (!viewport) return

    fadeDeps
    updateFadesFromViewport()

    const ro = new ResizeObserver(() => updateFadesFromViewport())
    ro.observe(viewport, { box: 'border-box' })
    const content = viewport.firstElementChild
    if (content) ro.observe(content, { box: 'border-box' })

    let secondRaf = 0
    const firstRaf = requestAnimationFrame(() => {
      secondRaf = requestAnimationFrame(() => updateFadesFromViewport())
    })

    return () => {
      ro.disconnect()
      cancelAnimationFrame(firstRaf)
      if (secondRaf) cancelAnimationFrame(secondRaf)
      if (fadeRaf) {
        cancelAnimationFrame(fadeRaf)
        fadeRaf = 0
      }
    }
  })

  $effect.pre(() => {
    const visibleCount = config.isLoading() ? 0 : config.entries().length
    const totalCount = getTotalCount(
      config.isLoading(),
      config.focusedChallengeId(),
      config.entries().length,
      config.total()
    )

    scroll.state.count = totalCount
    scroll.state.loadMoreCount = visibleCount
    scroll.state.hasNextPage = getHasNextPage(
      config.isLoading(),
      config.focusedChallengeId(),
      config.hasNextPage()
    )
    scroll.state.isFetching = config.isLoading() || config.isFetchingNextPage()
    scroll.state.scrollMargin = listScrollMargin
  })

  function updateFadesFromViewport() {
    if (fadeRaf) return
    fadeRaf = requestAnimationFrame(() => {
      fadeRaf = 0
      const viewport = scroll.state.viewportRef
      if (!viewport?.isConnected) return
      updateFades({
        scrollTop: viewport.scrollTop,
        scrollLeft: viewport.scrollLeft,
        scrollHeight: viewport.scrollHeight,
        scrollWidth: viewport.scrollWidth,
        clientHeight: viewport.clientHeight,
        clientWidth: viewport.clientWidth,
      })
    })
  }

  return {
    scroll,
    get themeRenderEpoch() {
      return themeRenderEpoch
    },
    get isDesktop() {
      return isDesktop
    },
    get isXl() {
      return isXl
    },
    get listScrollMargin() {
      return listScrollMargin
    },
    get showTopFade() {
      return showTopFade
    },
    get showBottomFade() {
      return showBottomFade
    },
    get showLeftFade() {
      return showLeftFade
    },
    get showRightFade() {
      return showRightFade
    },
    get headerRowRef() {
      return headerRowRef
    },
    set headerRowRef(value: HTMLElement | null) {
      headerRowRef = value
    },
    get userEntryIndex() {
      return userEntryIndex
    },
    get viewportVisibility() {
      return viewportVisibility
    },
    get showSelfRow() {
      return showSelfRow
    },
    get selfRowPosition() {
      return selfRowPosition
    },
    get contentWidth() {
      return contentWidth
    },
    get visibleGraphData() {
      return visibleGraphData
    },
    get contextTeamIds() {
      return contextTeamIds
    },
    get scrollbarYPadding() {
      return scrollbarYPadding
    },
  }
}

function getViewportVisibility(
  metrics: ScrollMetrics | null,
  virtualItems: { index: number; start: number; size: number }[],
  entries: ScoreEntry[],
  listScrollMargin: number,
  userEntryIndex: number
): ViewportVisibility {
  const visibleRanks = getVisibleRanks(metrics, virtualItems, entries.length, listScrollMargin)
  const userVisibility = getUserVisibility(
    metrics,
    virtualItems,
    listScrollMargin,
    userEntryIndex
  )

  return {
    minRank: visibleRanks.minRank,
    maxRank: visibleRanks.maxRank,
    userVisible: userVisibility.userVisible,
    userClippedTop: userVisibility.userClippedTop,
  }
}

function getVisibleRanks(
  metrics: ScrollMetrics | null,
  virtualItems: { index: number; start: number; size: number }[],
  entryCount: number,
  listScrollMargin: number
) {
  let minRank = Infinity
  let maxRank = 0
  let visibleCount = 0

  if (!metrics || entryCount === 0) return { minRank: 0, maxRank: 0 }

  for (const item of virtualItems) {
    if (item.index >= entryCount) continue

    const itemTop = item.start
    const itemBottom = item.start + item.size
    const viewportTop = metrics.scrollTop + listScrollMargin
    const viewportBottom = metrics.scrollTop + metrics.clientHeight

    if (itemBottom > viewportTop && itemTop < viewportBottom) {
      const rank = item.index + 1
      if (rank < minRank) minRank = rank
      if (rank > maxRank) maxRank = rank
      visibleCount++
    }
  }

  return {
    minRank: visibleCount > 0 ? minRank : 0,
    maxRank: visibleCount > 0 ? maxRank : 0,
  }
}

function getUserVisibility(
  metrics: ScrollMetrics | null,
  virtualItems: { index: number; start: number; size: number }[],
  listScrollMargin: number,
  userEntryIndex: number
) {
  if (userEntryIndex === -1 || !metrics) {
    return { userVisible: false, userClippedTop: false }
  }

  const userItem = virtualItems.find(item => item.index === userEntryIndex)
  if (!userItem) return { userVisible: false, userClippedTop: false }

  const viewportTop = metrics.scrollTop + listScrollMargin
  const viewportBottom = metrics.scrollTop + metrics.clientHeight
  const itemTop = userItem.start
  const itemBottom = userItem.start + userItem.size
  return {
    userVisible: itemTop >= viewportTop && itemBottom <= viewportBottom,
    userClippedTop: itemTop < viewportTop,
  }
}

function getScrollbarYPadding(
  showSelfRow: boolean,
  selfRowPosition: 'top' | 'bottom',
  isDesktop: boolean
): string {
  const selfRowPb = 'pb-[calc(var(--row-height-full)+4px)]'
  const selfRowPt = isDesktop
    ? 'pt-[calc(var(--header-height)+var(--row-height-full)+4px)]'
    : 'pt-[calc(var(--row-height-full)+4px)]'

  if (showSelfRow && selfRowPosition === 'top') return `${selfRowPt} pb-1`
  if (showSelfRow) return `${isDesktop ? 'pt-(--header-height)' : ''} ${selfRowPb}`
  return `${isDesktop ? 'pt-(--header-height)' : ''} pb-1`
}

function getTotalCount(
  isLoading: boolean,
  focusedChallengeId: string | null,
  entryCount: number,
  total: number
): number {
  if (isLoading) return 0
  if (focusedChallengeId) return entryCount
  return Math.max(total, entryCount)
}

function getHasNextPage(
  isLoading: boolean,
  focusedChallengeId: string | null,
  hasNextPage: boolean
): boolean {
  if (isLoading) return false
  if (focusedChallengeId) return false
  return hasNextPage
}
