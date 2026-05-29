import { useInfiniteVirtualScroll, type ScrollMetrics } from '$lib/utils'
import { onMount } from 'svelte'
import {
  getEmptyGraphVisibility,
  getGraphVisibility,
} from './scores-leaderboard-data-transforms'
import {
  SCORE_DIAGONAL_OVERFLOW_PX,
  SCORE_ROW_HEIGHT_FULL_PX,
  SCORE_SCROLL_RESET_DELAY_MS,
  SCORE_VIRTUAL_OVERSCAN,
} from './scores-leaderboard-layout-constants'
import type {
  CurrentUserScoreData,
  GraphVisibility,
  ScoreEntry,
  ScoreGraphEntry,
  ViewportVisibility,
} from './scores-shared-types'

type ScoresScroll = ReturnType<typeof useInfiniteVirtualScroll>
type SelfRowPosition = 'top' | 'bottom'

interface ScoresViewportStateConfig {
  entries: () => ScoreEntry[]
  total: () => number
  isLoading: () => boolean
  search: () => string | undefined
  focusedChallengeId: () => string | null
  currentUser: () => CurrentUserScoreData | null | undefined
  showTop3Context: () => boolean
  showSelfContext: () => boolean
  contentCellsWidth: () => number
  allGraphData: () => ScoreGraphEntry[]
  teamRanks: () => Map<string, number>
  hasNextPage: () => boolean
  isFetchingNextPage: () => boolean
  fetchNextPage: () => void
  onScroll?: () => void
}

interface ScoresViewportGraphConfig {
  config: ScoresViewportStateConfig
  scroll: ScoresScroll
  viewportVisibility: () => ViewportVisibility
}

export function createScoresViewportState(config: ScoresViewportStateConfig) {
  const media = createScoresMediaState()
  const header = createScoresHeaderMeasurementState()
  const fades = createScoresFadeState()
  let scrollMetrics = $state<ScrollMetrics | null>(null)

  function handleScrollMetrics(metrics: ScrollMetrics) {
    config.onScroll?.()
    scrollMetrics = metrics
    fades.updateFromScroll(metrics)
  }

  const scroll = useInfiniteVirtualScroll({
    rowHeight: SCORE_ROW_HEIGHT_FULL_PX,
    overscan: SCORE_VIRTUAL_OVERSCAN,
    isScrollingResetDelay: SCORE_SCROLL_RESET_DELAY_MS,
    onLoadMore: config.fetchNextPage,
    onScroll: handleScrollMetrics,
  })

  const userEntryIndex = $derived.by(() => {
    const currentUser = config.currentUser()
    return currentUser
      ? config.entries().findIndex(entry => entry.id === currentUser.id)
      : -1
  })

  const viewportVisibility = $derived(
    getViewportVisibility(
      scrollMetrics,
      scroll.virtualItems,
      config.entries(),
      header.listScrollMargin,
      userEntryIndex
    )
  )

  const showSelfRow = $derived.by(() => {
    if (config.search()) return false
    if (config.isLoading() && config.currentUser()) return true
    if (!config.currentUser()?.globalPlace) return false
    if (viewportVisibility.userVisible) return false
    return true
  })

  const selfRowPosition = $derived.by((): SelfRowPosition => {
    const currentUser = config.currentUser()
    if (!currentUser?.globalPlace) return 'bottom'
    if (userEntryIndex === -1) return 'bottom'
    if (viewportVisibility.userClippedTop) return 'top'
    const userItem = scroll.virtualItems.find(
      item => item.index === userEntryIndex
    )
    if (!userItem) {
      return viewportVisibility.minRank > userEntryIndex + 1 ? 'top' : 'bottom'
    }
    return 'bottom'
  })

  const contentWidth = $derived(
    config.contentCellsWidth() + SCORE_DIAGONAL_OVERFLOW_PX
  )
  const graph = createScoresViewportGraphState({
    config,
    scroll,
    viewportVisibility: () => viewportVisibility,
  })
  const fadeRefreshKey = $derived({
    contentWidth,
    listScrollMargin: header.listScrollMargin,
    showSelfRow,
    selfRowPosition,
    isDesktop: media.isDesktop,
    isLoading: config.isLoading(),
    focusedChallengeId: config.focusedChallengeId(),
    entryCount: config.entries().length,
  })

  createLayoutFadeRefresher(scroll, fades, () => fadeRefreshKey)
  syncVirtualScrollState(scroll, config, () => header.listScrollMargin)

  return {
    scroll,
    get themeRenderEpoch() {
      return media.themeRenderEpoch
    },
    get isDesktop() {
      return media.isDesktop
    },
    get listScrollMargin() {
      return header.listScrollMargin
    },
    get showTopFade() {
      return fades.showTop
    },
    get showBottomFade() {
      return fades.showBottom
    },
    get showLeftFade() {
      return fades.showLeft
    },
    get showRightFade() {
      return fades.showRight
    },
    get headerRowRef() {
      return header.headerRowRef
    },
    set headerRowRef(value: HTMLElement | null) {
      header.headerRowRef = value
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
      return graph.visibleGraphData
    },
    get contextTeamIds() {
      return graph.contextTeamIds
    },
    get scrollMetrics() {
      return scrollMetrics
    },
  }
}

function createScoresViewportGraphState({
  config,
  scroll,
  viewportVisibility,
}: ScoresViewportGraphConfig) {
  const graphVisibility = $derived.by(() => {
    const visibility = viewportVisibility()
    return getGraphVisibility({
      entries: config.entries(),
      isLoading: config.isLoading(),
      minRank: visibility.minRank,
      maxRank: visibility.maxRank,
      focusedChallengeId: config.focusedChallengeId(),
      showTop3Context: config.showTop3Context(),
      showSelfContext: config.showSelfContext(),
      currentUserId: config.currentUser()?.id ?? null,
      teamRanks: config.teamRanks(),
    })
  })
  const graphVisibilityState = createStableGraphVisibility(
    () => graphVisibility,
    () => scroll.isScrolling
  )
  const visibleGraphData = $derived(
    config
      .allGraphData()
      .filter(team => graphVisibilityState.value.visibleTeamIds.has(team.id))
  )
  const contextTeamIds = $derived(graphVisibilityState.value.contextTeamIds)

  return {
    get visibleGraphData() {
      return visibleGraphData
    },
    get contextTeamIds() {
      return contextTeamIds
    },
  }
}

function createScoresMediaState() {
  let themeRenderEpoch = $state(0)
  let isDesktop = $state(true)

  onMount(() => {
    const mqlDesktop = window.matchMedia('(min-width: 768px)')
    const root = document.documentElement

    const updateDesktop = () => (isDesktop = mqlDesktop.matches)

    updateDesktop()

    mqlDesktop.addEventListener('change', updateDesktop)

    const themeObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          themeRenderEpoch = Date.now()
          break
        }
      }
    })
    themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => {
      mqlDesktop.removeEventListener('change', updateDesktop)
      themeObserver.disconnect()
    }
  })

  return {
    get themeRenderEpoch() {
      return themeRenderEpoch
    },
    get isDesktop() {
      return isDesktop
    },
  }
}

function createScoresHeaderMeasurementState() {
  let headerRowRef = $state<HTMLElement | null>(null)
  let listScrollMargin = $state(0)
  let resizeObserver: ResizeObserver | null = null

  function setHeaderRowRef(header: HTMLElement | null) {
    resizeObserver?.disconnect()
    resizeObserver = null
    headerRowRef = header
    if (!header) {
      listScrollMargin = 0
      return
    }

    resizeObserver = new ResizeObserver(entries => {
      const height = entries[0]?.contentRect.height ?? 0
      listScrollMargin = Math.round(height)
    })
    resizeObserver.observe(header)
    listScrollMargin = Math.round(header.getBoundingClientRect().height)
  }

  return {
    get headerRowRef() {
      return headerRowRef
    },
    set headerRowRef(value: HTMLElement | null) {
      setHeaderRowRef(value)
    },
    get listScrollMargin() {
      return listScrollMargin
    },
  }
}

function createScoresFadeState() {
  let showTop = $state(false)
  let showBottom = $state(false)
  let showLeft = $state(false)
  let showRight = $state(false)

  function update(metrics: ScrollMetrics) {
    const next = getFadeVisibility(metrics)
    if (showTop !== next.top) showTop = next.top
    if (showBottom !== next.bottom) showBottom = next.bottom
    if (showLeft !== next.left) showLeft = next.left
    if (showRight !== next.right) showRight = next.right
  }

  return {
    get showTop() {
      return showTop
    },
    get showBottom() {
      return showBottom
    },
    get showLeft() {
      return showLeft
    },
    get showRight() {
      return showRight
    },
    updateFromScroll: update,
    updateFromLayout: update,
  }
}

function createStableGraphVisibility(
  getVisibility: () => GraphVisibility,
  getIsScrolling: () => boolean
) {
  let value = $state<GraphVisibility>(getEmptyGraphVisibility())

  $effect(() => {
    // Keep graph teams stable during wheel/trackpad motion so the chart does not flicker.
    if (!getIsScrolling()) value = getVisibility()
  })

  return {
    get value() {
      return value
    },
  }
}

function createLayoutFadeRefresher(
  scroll: ScoresScroll,
  fades: ReturnType<typeof createScoresFadeState>,
  getRefreshKey: () => unknown
) {
  let fadeRaf = 0

  function scheduleRefresh(_key: unknown) {
    if (fadeRaf) return
    fadeRaf = requestAnimationFrame(() => {
      fadeRaf = 0
      const viewport = scroll.state.viewportRef
      if (!viewport?.isConnected) return
      fades.updateFromLayout(readScrollMetrics(viewport))
    })
  }

  $effect(() => {
    // ResizeObserver/rAF reads are DOM synchronization; scroll handlers own tooltip closing.
    const viewport = scroll.state.viewportRef
    if (!viewport) return

    scheduleRefresh(getRefreshKey())

    const ro = new ResizeObserver(() => scheduleRefresh(getRefreshKey()))
    ro.observe(viewport, { box: 'border-box' })
    const content = viewport.firstElementChild
    if (content) ro.observe(content, { box: 'border-box' })

    let secondRaf = 0
    const firstRaf = requestAnimationFrame(() => {
      secondRaf = requestAnimationFrame(() => scheduleRefresh(getRefreshKey()))
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
}

function syncVirtualScrollState(
  scroll: ScoresScroll,
  config: ScoresViewportStateConfig,
  getListScrollMargin: () => number
) {
  $effect.pre(() => {
    // The virtualizer stores mutable runtime state outside Svelte's derived graph.
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
    scroll.state.scrollMargin = getListScrollMargin()
  })
}

function readScrollMetrics(viewport: HTMLElement): ScrollMetrics {
  return {
    scrollTop: viewport.scrollTop,
    scrollLeft: viewport.scrollLeft,
    scrollHeight: viewport.scrollHeight,
    scrollWidth: viewport.scrollWidth,
    clientHeight: viewport.clientHeight,
    clientWidth: viewport.clientWidth,
  }
}

function getFadeVisibility(metrics: ScrollMetrics) {
  // Start edges use a strict 0 so any scroll shows a fade; end edges keep 1px
  // of slop so the fade still clears at the extreme on fractional-DPI displays.
  const endTolerance = 1
  return {
    top: metrics.scrollTop > 0,
    bottom:
      metrics.scrollTop + metrics.clientHeight <
      metrics.scrollHeight - endTolerance,
    left: metrics.scrollLeft > 0,
    right:
      metrics.scrollLeft + metrics.clientWidth <
      metrics.scrollWidth - endTolerance,
  }
}

function getViewportVisibility(
  metrics: ScrollMetrics | null,
  virtualItems: { index: number; start: number; size: number }[],
  entries: ScoreEntry[],
  listScrollMargin: number,
  userEntryIndex: number
): ViewportVisibility {
  const visibleRanks = getVisibleRanks(
    metrics,
    virtualItems,
    entries.length,
    listScrollMargin
  )
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
