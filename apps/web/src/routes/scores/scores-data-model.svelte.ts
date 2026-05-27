import { useClientConfig } from '$lib/query/config'
import { ApiError } from '$lib/query/core'
import {
  useInfiniteLeaderboardWithGraph,
  useLeaderboardChallenges,
  useSelfUserGraph,
} from '$lib/query/leaderboard'
import { useCurrentUser } from '$lib/query/user'
import {
  getBloodIndex,
  getCategoryGroups,
  getCategoryStatsForSolves,
  getChallengesByCategory,
  getChallengesBySolves,
  getFocusedEntries,
  getOriginalRankByTeam,
  getRankDeltaByTeam,
  getScreenshotSelfTeam,
  getScreenshotTeams,
  getSolvesAndTimesByTeam,
  getSparklineDataByTeam,
  getTeamColorMap,
  getTeamRanks,
} from './scores-data-helpers'
import type {
  CurrentUserScoreData,
  ScoreEntry,
  ScoreGraphEntry,
  SortMode,
} from './types'

const LEADERBOARD_PAGE_SIZE = 100

interface ScoresDataModelConfig {
  division: () => string | undefined
  search: () => string | undefined
  focusedChallengeId: () => string | null
}

interface ScoresGraphDataConfig {
  showSelfRow: () => boolean
  search: () => string | undefined
  entries: () => ScoreEntry[]
  allGraphData: () => ScoreGraphEntry[]
  currentUser: () => CurrentUserScoreData | null | undefined
  challengesData: () => Record<string, { scoringKind?: 'decay' | 'dynamic' }>
  teamColorMap: () => Map<string, string>
}

export function createScoresDataModel(config: ScoresDataModelConfig) {
  const clientConfigQuery = useClientConfig()
  const divisions = $derived(clientConfigQuery.data?.divisions ?? {})
  const division = $derived.by((): string | undefined => {
    const value = config.division()
    if (value && divisions[value]) return value
    return undefined
  })
  const leaderboardQuery = useInfiniteLeaderboardWithGraph(() => ({
    pageSize: LEADERBOARD_PAGE_SIZE,
    division,
    search: config.search(),
  }))
  const challengesQuery = useLeaderboardChallenges()
  const userQuery = useCurrentUser()

  const rawEntries = $derived(
    leaderboardQuery.data?.pages.flatMap(page => page.leaderboard) ?? []
  )
  const originalRankByTeam = $derived(getOriginalRankByTeam(rawEntries))
  const currentUser = $derived(userQuery.data)
  const challengesData = $derived(challengesQuery.data ?? {})
  const entries = $derived(
    getFocusedEntries(rawEntries, config.focusedChallengeId(), challengesData)
  )
  const allGraphData = $derived(
    leaderboardQuery.data?.pages.flatMap(page => page.graph) ?? []
  )
  const total = $derived(leaderboardQuery.data?.pages[0]?.total ?? 0)
  const isNotStarted = $derived(ApiError.isNotStarted(leaderboardQuery.error))
  const isLoading = $derived(
    leaderboardQuery.isLoading || challengesQuery.isLoading
  )
  const showDivision = $derived(
    clientConfigQuery.data
      ? Object.keys(clientConfigQuery.data.divisions).length > 1
      : false
  )
  const dataEpoch = $derived(
    Math.max(
      leaderboardQuery.dataUpdatedAt ?? 0,
      challengesQuery.dataUpdatedAt ?? 0,
      userQuery.dataUpdatedAt ?? 0
    )
  )
  const challengesByCategory = $derived(getChallengesByCategory(challengesData))
  const challengesBySolves = $derived(
    getChallengesBySolves(challengesByCategory)
  )
  const categoryGroups = $derived(getCategoryGroups(challengesByCategory))
  const teamColorMap = $derived(getTeamColorMap(rawEntries, currentUser))
  const solvesAndTimes = $derived(getSolvesAndTimesByTeam(entries))
  const teamRanks = $derived(
    getTeamRanks(
      entries,
      originalRankByTeam,
      config.search(),
      config.focusedChallengeId()
    )
  )

  function fetchFocusedChallengePages() {
    // FIXME(es3n1n): When filtering by challenge we need every page loaded
    //  to know which teams solved it, so chain-fetch until exhausted
    if (
      config.focusedChallengeId() &&
      leaderboardQuery.hasNextPage &&
      !leaderboardQuery.isFetchingNextPage
    ) {
      void leaderboardQuery.fetchNextPage()
    }
  }

  $effect(fetchFocusedChallengePages)

  function getChallenges(sortMode: SortMode) {
    return sortMode === 'solves' ? challengesBySolves : challengesByCategory
  }

  return {
    clientConfigQuery,
    leaderboardQuery,
    challengesQuery,
    userQuery,
    get divisions() {
      return divisions
    },
    get division() {
      return division
    },
    get originalRankByTeam() {
      return originalRankByTeam
    },
    get entries() {
      return entries
    },
    get allGraphData() {
      return allGraphData
    },
    get total() {
      return total
    },
    get currentUser() {
      return currentUser
    },
    get challengesData() {
      return challengesData
    },
    get isNotStarted() {
      return isNotStarted
    },
    get isLoading() {
      return isLoading
    },
    get showDivision() {
      return showDivision
    },
    get dataEpoch() {
      return dataEpoch
    },
    get categoryGroups() {
      return categoryGroups
    },
    get teamColorMap() {
      return teamColorMap
    },
    get solvesByTeam() {
      return solvesAndTimes.solvesByTeam
    },
    get solveTimesByTeam() {
      return solvesAndTimes.solveTimesByTeam
    },
    get challengePointsByTeam() {
      return solvesAndTimes.challengePointsByTeam
    },
    get challengePointDeltasByTeam() {
      return solvesAndTimes.challengePointDeltasByTeam
    },
    get teamRanks() {
      return teamRanks
    },
    getChallenges,
    getBloodIndex: (challengeId: string, teamId: string) =>
      getBloodIndex(challengesData, challengeId, teamId),
    getCategoryStatsForSolves,
  }
}

export function createScoresGraphDataModel(config: ScoresGraphDataConfig) {
  const selfGraphQuery = useSelfUserGraph(() =>
    config.showSelfRow() && config.currentUser()?.globalPlace
      ? config.currentUser()!.globalPlace
      : null
  )

  const sparklineDataByTeam = $derived(
    getSparklineDataByTeam(config.allGraphData(), selfGraphQuery.data)
  )
  const rankDeltaByTeam = $derived(
    getRankDeltaByTeam(
      config.search(),
      config.allGraphData(),
      selfGraphQuery.data
    )
  )
  const screenshotTeams = $derived(
    getScreenshotTeams(
      config.entries(),
      config.currentUser(),
      config.challengesData(),
      config.teamColorMap(),
      sparklineDataByTeam
    )
  )
  const screenshotSelfTeam = $derived(
    getScreenshotSelfTeam(
      config.currentUser(),
      config.challengesData(),
      sparklineDataByTeam
    )
  )

  return {
    selfGraphQuery,
    get sparklineDataByTeam() {
      return sparklineDataByTeam
    },
    get rankDeltaByTeam() {
      return rankDeltaByTeam
    },
    get screenshotTeams() {
      return screenshotTeams
    },
    get screenshotSelfTeam() {
      return screenshotSelfTeam
    },
  }
}
