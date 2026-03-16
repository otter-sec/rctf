import type { ClientConfig } from '@rctf/types'
import type { Fetcher } from './fetcher.ts'
import { writeApiResponse, writeDump } from './writer.ts'

export type UploadUrl = {
  originalUrl: string
  type: 'relative' | 'absolute'
}

export type DiscoveryResult = {
  uploadUrls: UploadUrl[]
}

function collectUrl(url: string | null | undefined, urls: UploadUrl[]) {
  if (!url) {
    return
  }

  if (url.startsWith('/uploads/')) {
    urls.push({ originalUrl: url, type: 'relative' })
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    urls.push({ originalUrl: url, type: 'absolute' })
  }
}

export async function discoverAndFetch(options: {
  fetcher: Fetcher
  outputDir: string
  skipUploads: boolean
}): Promise<DiscoveryResult> {
  const { fetcher, outputDir } = options
  const uploadUrls: UploadUrl[] = []

  console.log('[Phase 1] Fetching client config...')
  const configResult = await fetcher.fetchJson(
    '/api/v2/integrations/client/config'
  )
  if (!configResult.ok) {
    throw new Error('Failed to fetch client config')
  }

  const configResponse = configResult.data as {
    kind: string
    data: ClientConfig
  }

  const configData = configResponse.data
  console.log(
    `  Found ${Object.keys(configData.divisions).length} divisions: ${Object.keys(configData.divisions).join(', ')}`
  )

  for (const sponsor of configData.sponsors) {
    collectUrl(sponsor.icon, uploadUrls)
  }
  collectUrl(configData.faviconUrl, uploadUrls)
  collectUrl(configData.logoLightUrl, uploadUrls)
  collectUrl(configData.logoDarkUrl, uploadUrls)
  collectUrl(configData.meta.imageUrl, uploadUrls)

  configData.isArchived = true
  await writeApiResponse(
    outputDir,
    '/api/v2/integrations/client/config',
    configResult.data
  )

  console.log('[Phase 2] Fetching challenges...')
  const challsResult = await fetcher.fetchAndWrite('/api/v2/challs')
  await fetcher.fetchAndWrite('/api/v2/leaderboard/challs')

  if (challsResult.ok) {
    const challsResponse = challsResult.data as {
      data: { id: string; files: { url: string }[] }[]
    }
    for (const chall of challsResponse.data) {
      for (const file of chall.files) {
        collectUrl(file.url, uploadUrls)
      }
    }
  }

  console.log('[Phase 3] Fetching leaderboard dump...')
  type LeaderboardEntry = {
    id: string
    avatarUrl: string | null
    globalPlace: number | null
    division: string
    name: string
  }
  type GraphEntry = {
    id: string
    points: { time: number; score: number }[]
  }

  const allLeaderboard: LeaderboardEntry[] = []
  const allGraph: GraphEntry[] = []

  let offset = 0
  const limit = 100
  while (true) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    })

    const result = await fetcher.fetchJson(
      `/api/v2/leaderboard/with-graph?${params}`
    )
    if (!result.ok) {
      break
    }

    const response = result.data as {
      data: {
        total: number
        leaderboard: LeaderboardEntry[]
        graph: GraphEntry[]
      }
    }

    for (const entry of response.data.leaderboard) {
      allLeaderboard.push(entry)
      collectUrl(entry.avatarUrl, uploadUrls)
    }
    for (const g of response.data.graph) {
      allGraph.push(g)
    }

    if (
      response.data.leaderboard.length < limit ||
      offset + limit >= response.data.total
    ) {
      break
    }
    offset += limit
  }

  console.log(
    `  Dumped ${allLeaderboard.length} leaderboard entries, ${allGraph.length} graph entries`
  )

  await writeDump(outputDir, 'v2/leaderboard/dump.json', {
    leaderboard: allLeaderboard,
    graph: allGraph,
  })

  console.log('[Phase 4] Collecting user IDs...')
  const userIds = [...new Set(allLeaderboard.map(e => e.id))]
  console.log(`  Found ${userIds.length} unique users`)

  console.log('[Phase 5] Fetching user profiles...')
  await Promise.all(
    userIds.map(async id => {
      const result = await fetcher.fetchAndWrite(`/api/v2/users/${id}`)
      if (result.ok) {
        const userResponse = result.data as {
          data: { avatarUrl: string | null }
        }
        collectUrl(userResponse.data.avatarUrl, uploadUrls)
      }
    })
  )
  console.log(`  Fetched ${userIds.length} user profiles`)

  console.log('[Phase 6] Fetching challenge solves...')
  if (challsResult.ok) {
    const challsResponse = challsResult.data as {
      data: { id: string }[]
    }

    await Promise.all(
      challsResponse.data.map(async chall => {
        const allSolves: { userAvatarUrl: string | null }[] = []
        let offset = 0
        const limit = 100

        while (true) {
          const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
          })
          const result = await fetcher.fetchJson(
            `/api/v2/challs/${chall.id}/solves?${params}`
          )
          if (!result.ok) {
            break
          }

          const response = result.data as {
            data: { solves: { userAvatarUrl: string | null }[] }
          }

          for (const solve of response.data.solves) {
            allSolves.push(solve)
            collectUrl(solve.userAvatarUrl, uploadUrls)
          }

          if (response.data.solves.length < limit) {
            break
          }
          offset += limit
        }

        await writeDump(outputDir, `v2/challs/${chall.id}/solves.json`, {
          solves: allSolves,
        })
      })
    )
  }
  console.log('  Done fetching challenge solves')

  console.log('[Phase 7] Writing static auth mock...')
  await writeApiResponse(outputDir, '/api/v2/users/me', {
    kind: 'badToken',
    message: 'The token provided is invalid.',
    data: null,
  })

  return { uploadUrls }
}
