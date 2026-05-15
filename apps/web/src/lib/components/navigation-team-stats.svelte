<script lang="ts">
  import { SPARKLINE_WINDOW } from '$lib/constants/scores'
  import { useCurrentUser, useLeaderboard, useSelfUserGraph } from '$lib/query'
  import { cn, getTimeOrdinal } from '$lib/utils'
  import { ChartCore, Spline, Svg } from 'layerchart/svg'

  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)
  const globalPlace = $derived(user?.globalPlace ?? null)

  const graphQuery = useSelfUserGraph(() => globalPlace)
  const graphData = $derived.by(() => {
    const points = graphQuery.data?.points ?? []
    let maxTime = 0
    for (const point of points) {
      if (point.time > maxTime) maxTime = point.time
    }
    const windowStart = maxTime - SPARKLINE_WINDOW
    return points.filter(p => p.time >= windowStart)
  })

  const leaderboardQuery = useLeaderboard(() => ({ limit: 1, offset: 0 }))
  const totalTeams = $derived(leaderboardQuery.data?.total ?? 0)

  const gradientId = $derived(`nav-sparkline-gradient-${globalPlace ?? 0}`)

  const styles = $derived.by(() => {
    if (!globalPlace)
      return {
        bg: 'bg-background-nth',
        fgL0: 'text-foreground-nth-l0',
        fgL1: 'text-foreground-nth-l1',
        stroke: 'var(--foreground-nth-l0)',
      }
    if (globalPlace === 1)
      return {
        bg: 'bg-background-gold',
        fgL0: 'text-foreground-gold-l0',
        fgL1: 'text-foreground-gold-l1',
        stroke: 'var(--foreground-gold-l0)',
      }
    if (globalPlace === 2)
      return {
        bg: 'bg-background-silver',
        fgL0: 'text-foreground-silver-l0',
        fgL1: 'text-foreground-silver-l1',
        stroke: 'var(--foreground-silver-l0)',
      }
    if (globalPlace === 3)
      return {
        bg: 'bg-background-bronze',
        fgL0: 'text-foreground-bronze-l0',
        fgL1: 'text-foreground-bronze-l1',
        stroke: 'var(--foreground-bronze-l0)',
      }
    return {
      bg: 'bg-background-l2',
      fgL0: 'text-foreground-l0',
      fgL1: 'text-foreground-l3',
      stroke: 'var(--foreground-l3)',
    }
  })
</script>

{#if user && globalPlace}
  <div
    class={cn(
      'hidden h-12 w-40 items-center gap-1 overflow-hidden rounded-lg pr-2 pl-4 lg:flex',
      styles.bg
    )}
  >
    <div class="flex min-w-0 flex-col justify-center">
      <span class={cn('text-base leading-tight', styles.fgL0)}>
        {getTimeOrdinal(globalPlace)}
      </span>
      <span class={cn('text-xs leading-tight', styles.fgL1)}>
        of {totalTeams.toLocaleString()}
      </span>
    </div>

    <div class="flex h-full flex-1 items-center">
      {#if graphData.length > 1}
        <div class="h-10 w-full">
          <ChartCore
            data={graphData}
            x="time"
            y="score"
            yDomain={null}
            padding={{ top: 4, bottom: 4, left: 2, right: 2 }}
          >
            <Svg>
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color={styles.stroke} stop-opacity="0" />
                  <stop offset="100%" stop-color={styles.stroke} stop-opacity="1" />
                </linearGradient>
              </defs>
              <Spline
                class="fill-none stroke-2"
                stroke="url(#{gradientId})"
                style="stroke-linecap: round; stroke-linejoin: round;"
              />
            </Svg>
          </ChartCore>
        </div>
      {:else}
        <div class="flex h-10 w-full items-center justify-center">
          <div
            class="to-foreground-l5/20 h-0.5 w-full rounded-full bg-linear-to-r from-transparent"
          ></div>
        </div>
      {/if}
    </div>
  </div>
{/if}
