import { ApiError } from '$lib/query/core'
import {
  mergeLeaderboardPages,
  useLeaderboardChallenges,
  useLeaderboardWithGraph,
  useSelfUserGraph,
} from '$lib/query/leaderboard'
import { useCurrentUser } from '$lib/query/user'
import {
  getBloodIndex,
  getCategoryGroups,
  getCategoryStatsForSolves,
  getChallengesByCategory,
  getChallengesBySolves,
  getRankDeltaByTeam,
  getSparklineDataByTeam,
  getTeamColorMap,
  getTeamRanks,
} from './transforms'
import type { SortMode } from '../leaderboard/url-params'

export type ScoresData = ReturnType<typeof createScoresData>

interface ScoresDataConfig {
  division: () => string | undefined
  search: () => string | undefined
  sortMode: () => SortMode
  showTop3Context: () => boolean
  showSelfContext: () => boolean
}

export function createScoresData(config: ScoresDataConfig) {
  const leaderboardQuery = useLeaderboardWithGraph(() => ({
    division: config.division(),
    search: config.search(),
  }))
  const challengesQuery = useLeaderboardChallenges()
  const userQuery = useCurrentUser()

  const merged = $derived(
    mergeLeaderboardPages(leaderboardQuery.data?.pages ?? [])
  )
  const entries = $derived(merged.leaderboard)
  const allGraphData = $derived(merged.graph)
  const total = $derived(merged.total)
  const currentUser = $derived(userQuery.data)
  const currentUserId = $derived(currentUser?.id ?? null)
  const challengesData = $derived(challengesQuery.data ?? {})

  const selfGraphQuery = useSelfUserGraph(
    () =>
      config.showSelfContext() && currentUser?.globalPlace
        ? currentUser.globalPlace
        : null,
    () => currentUser?.id ?? null
  )

  const challengesByCategory = $derived(getChallengesByCategory(challengesData))
  const challengesBySolves = $derived(
    getChallengesBySolves(challengesByCategory)
  )
  const challenges = $derived(
    config.sortMode() === 'solves' ? challengesBySolves : challengesByCategory
  )
  const categoryGroups = $derived(getCategoryGroups(challengesByCategory))

  const teamColorMap = $derived(getTeamColorMap(entries, currentUser))
  const teamRanks = $derived(getTeamRanks(entries))
  const sparklineDataByTeam = $derived(
    getSparklineDataByTeam(allGraphData, selfGraphQuery.data)
  )
  const rankDeltaByTeam = $derived(
    getRankDeltaByTeam(config.search(), allGraphData, selfGraphQuery.data)
  )

  const isLoading = $derived(
    leaderboardQuery.isLoading || challengesQuery.isLoading
  )
  // A filter-change refetch (search/division) keeps the previous board on screen
  // via keepPreviousData, so isPlaceholderData distinguishes it from the silent
  // 30s background poll — the toolbar's search spinner reads this.
  const isBoardFetching = $derived(
    leaderboardQuery.isFetching && leaderboardQuery.isPlaceholderData
  )
  const isNotStarted = $derived(ApiError.isNotStarted(leaderboardQuery.error))

  return {
    get entries() {
      return entries
    },
    get total() {
      return total
    },
    get currentUser() {
      return currentUser
    },
    get currentUserId() {
      return currentUserId
    },
    get challengesData() {
      return challengesData
    },
    get challenges() {
      return challenges
    },
    get categoryGroups() {
      return categoryGroups
    },
    get teamColorMap() {
      return teamColorMap
    },
    get teamRanks() {
      return teamRanks
    },
    get sparklineDataByTeam() {
      return sparklineDataByTeam
    },
    get rankDeltaByTeam() {
      return rankDeltaByTeam
    },
    get graphData() {
      return allGraphData
    },
    get showTop3Context() {
      return config.showTop3Context()
    },
    get showSelfContext() {
      return config.showSelfContext()
    },
    get isLoading() {
      return isLoading
    },
    get isBoardFetching() {
      return isBoardFetching
    },
    get isNotStarted() {
      return isNotStarted
    },
    get hasNextPage() {
      return leaderboardQuery.hasNextPage
    },
    get isFetchingNextPage() {
      return leaderboardQuery.isFetchingNextPage
    },
    fetchNextPage: () => leaderboardQuery.fetchNextPage(),
    getBloodIndex: (challengeId: string, teamId: string) =>
      getBloodIndex(challengesData, challengeId, teamId),
    getCategoryStatsForSolves,
  }
}
