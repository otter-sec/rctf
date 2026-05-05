<script lang="ts">
  import { Card, EmptyState, ScrollArea, Section, Spinner } from '$lib/components'
  import {
    IconChartAreaLineFilled,
    IconFlag3Filled,
    IconShieldFilled,
    IconSortAscendingNumbers,
    IconTrophyFilled,
    IconUsersGroup,
  } from '$lib/icons'
  import { useAdminStats, useClientConfig } from '$lib/query'
  import { formatLocalTime, getCategoryConfig, getCategoryStyle } from '$lib/utils'

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)

  const statsQuery = useAdminStats()
  const stats = $derived(statsQuery.data)
  const isPending = $derived(statsQuery.isPending)
  const error = $derived(statsQuery.error?.message)

  const formatNumber = (value: number): string => value.toLocaleString()
  const formatDate = (value: string | null): string =>
    value ? formatLocalTime(new Date(value).getTime()) : 'None'

  const barWidth = (value: number, total: number): number =>
    total <= 0 ? 0 : Math.max(4, Math.round((value / total) * 100))

  const divisionLabel = (division: string): string => clientConfig?.divisions[division] ?? division

  const heroStats = $derived(
    stats
      ? [
          {
            label: 'Registered teams',
            value: stats.teams.total,
            detail: `${formatNumber(stats.teams.active)} active`,
            icon: IconUsersGroup,
            tone: 'bg-background-blue-l0 text-foreground-blue-l0',
          },
          {
            label: 'Total solves',
            value: stats.solves.total,
            detail: `${formatNumber(stats.solves.accepted)} accepted`,
            icon: IconTrophyFilled,
            tone: 'bg-background-green-l0 text-foreground-green-l0',
          },
          {
            label: 'Challenges',
            value: stats.challenges.total,
            detail: `${formatNumber(stats.challenges.visible)} visible`,
            icon: IconFlag3Filled,
            tone: 'bg-background-orange-l0 text-foreground-orange-l0',
          },
          {
            label: 'Highest score',
            value: stats.scores.highest,
            detail: `${formatNumber(stats.scores.average)} average`,
            icon: IconChartAreaLineFilled,
            tone: 'bg-background-fuchsia-l0 text-foreground-fuchsia-l0',
          },
        ]
      : []
  )

  const teamRows = $derived(
    stats
      ? [
          { label: 'Active teams', value: stats.teams.active },
          { label: 'Scored teams', value: stats.teams.scored },
          { label: 'Banned teams', value: stats.teams.banned },
          { label: 'Admin accounts', value: stats.teams.admins },
        ]
      : []
  )

  const challengeRows = $derived(
    stats
      ? [
          { label: 'Visible', value: stats.challenges.visible },
          { label: 'Hidden', value: stats.challenges.hidden },
          { label: 'Scheduled', value: stats.challenges.scheduled },
          { label: 'Solved', value: stats.challenges.solved },
          { label: 'Unsolved', value: stats.challenges.unsolved },
        ]
      : []
  )

  const solveRows = $derived(
    stats
      ? [
          { label: 'Accepted solves', value: formatNumber(stats.solves.accepted) },
          { label: 'Scoreboard solves', value: formatNumber(stats.solves.scoreboard) },
          { label: 'Banned-team solves', value: formatNumber(stats.solves.banned) },
          { label: 'First solve', value: formatDate(stats.solves.firstAt) },
          { label: 'Latest solve', value: formatDate(stats.solves.latestAt) },
        ]
      : []
  )

  const maxCategorySolves = $derived(
    Math.max(0, ...(stats?.categories.map(category => category.solveCount) ?? []))
  )
</script>

<svelte:head>
  {#if clientConfig}
    <title>Statistics | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if stats}
  <ScrollArea
    class="h-[calc(100dvh-72px)]"
    fadeSize={64}
    fadeColor="background-l0"
    fadeOffsets={{ bottom: 32 }}
  >
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 pb-12 md:px-9">
      <div class="flex flex-col gap-1">
        <h1 class="text-foreground-l0 text-2xl font-semibold">Statistics</h1>
        <p class="text-foreground-l3 text-sm">
          {formatNumber(stats.teams.scored)} teams on the board - {formatDate(
            stats.solves.latestAt
          )}
        </p>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {#each heroStats as item}
          <Section.Root class="bg-background-l1">
            <Section.Content class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-foreground-l3 text-sm">{item.label}</div>
                <div class="text-foreground-l0 mt-1 truncate text-3xl font-semibold tabular-nums">
                  {formatNumber(item.value)}
                </div>
                <div class="text-foreground-l4 mt-1 truncate text-sm">{item.detail}</div>
              </div>
              <div class="{item.tone} shrink-0 rounded-lg p-2">
                <item.icon class="size-5" />
              </div>
            </Section.Content>
          </Section.Root>
        {/each}
      </div>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div class="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          <Section.Root class="bg-background-l1">
            <Section.Header>Teams</Section.Header>
            <Section.Content class="flex flex-col gap-2">
              {#each teamRows as row}
                <div class="flex items-center justify-between gap-3">
                  <span class="text-foreground-l3 truncate text-sm">{row.label}</span>
                  <span class="text-foreground-l1 shrink-0 tabular-nums">
                    {formatNumber(row.value)}
                  </span>
                </div>
              {/each}
            </Section.Content>
          </Section.Root>

          <Section.Root class="bg-background-l1">
            <Section.Header>Challenges</Section.Header>
            <Section.Content class="flex flex-col gap-2">
              {#each challengeRows as row}
                <div class="flex items-center justify-between gap-3">
                  <span class="text-foreground-l3 truncate text-sm">{row.label}</span>
                  <span class="text-foreground-l1 shrink-0 tabular-nums">
                    {formatNumber(row.value)}
                  </span>
                </div>
              {/each}
            </Section.Content>
          </Section.Root>

          <Section.Root class="bg-background-l1">
            <Section.Header>Solves</Section.Header>
            <Section.Content class="flex flex-col gap-2">
              {#each solveRows as row}
                <div class="flex items-center justify-between gap-3">
                  <span class="text-foreground-l3 truncate text-sm">{row.label}</span>
                  <span class="text-foreground-l1 shrink-0 text-right text-sm tabular-nums">
                    {row.value}
                  </span>
                </div>
              {/each}
            </Section.Content>
          </Section.Root>
        </div>

        <Section.Root class="bg-background-l1">
          <Section.Header class="flex items-center gap-2">
            <IconSortAscendingNumbers class="size-4" />
            Top teams
          </Section.Header>
          <Section.Content class="flex flex-col gap-2">
            {#if stats.topTeams.length === 0}
              <EmptyState icon={IconUsersGroup} title="No ranked teams" class="min-h-48" />
            {:else}
              {#each stats.topTeams as team}
                <a
                  href="/profile/{team.id}"
                  class="bg-background-l2 hover:bg-background-l3 flex items-center gap-3 rounded-lg p-3"
                >
                  <div
                    class="bg-background-accent text-foreground-accent flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums"
                  >
                    #{team.globalRank}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-foreground-l1 truncate text-sm font-medium">{team.name}</div>
                    <div class="text-foreground-l4 truncate text-sm">
                      {divisionLabel(team.division)}
                    </div>
                  </div>
                  <div class="shrink-0 text-right">
                    <div class="text-foreground-l1 text-sm tabular-nums">
                      {formatNumber(team.score)}
                    </div>
                    <div class="text-foreground-l4 text-xs tabular-nums">
                      {formatNumber(team.solveCount)} solves
                    </div>
                  </div>
                </a>
              {/each}
            {/if}
          </Section.Content>
        </Section.Root>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <Section.Root class="bg-background-l1">
          <Section.Header>Top challenges</Section.Header>
          <Section.Content class="flex flex-col gap-2">
            {#if stats.topChallenges.length === 0}
              <EmptyState icon={IconFlag3Filled} title="No challenges" class="min-h-48" />
            {:else}
              {#each stats.topChallenges as challenge}
                {@const category = getCategoryConfig(challenge.category)}
                <a
                  href="/admin/challenges?challenge={challenge.id}"
                  class="bg-background-l2 hover:bg-background-l3 flex items-center gap-3 rounded-lg p-3"
                >
                  <div
                    class="bg-category-background-l0 text-category-foreground-l0 shrink-0 rounded-lg p-2"
                    style={getCategoryStyle(category.color)}
                  >
                    <category.icon class="size-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-foreground-l1 truncate text-sm font-medium">
                      {challenge.name}
                    </div>
                    <div class="text-foreground-l4 truncate text-sm">{category.name}</div>
                  </div>
                  <div class="shrink-0 text-right">
                    <div class="text-foreground-l1 text-sm tabular-nums">
                      {formatNumber(challenge.solveCount)}
                    </div>
                    <div class="text-foreground-l4 text-xs tabular-nums">
                      {formatNumber(challenge.score)} pts
                    </div>
                  </div>
                </a>
              {/each}
            {/if}
          </Section.Content>
        </Section.Root>

        <Section.Root class="bg-background-l1">
          <Section.Header>Categories</Section.Header>
          <Section.Content class="flex flex-col gap-3">
            {#if stats.categories.length === 0}
              <EmptyState icon={IconFlag3Filled} title="No categories" class="min-h-48" />
            {:else}
              {#each stats.categories as category}
                {@const config = getCategoryConfig(category.name)}
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex min-w-0 items-center gap-2">
                      <div
                        class="bg-category-background-l0 text-category-foreground-l0 rounded-md p-1"
                        style={getCategoryStyle(config.color)}
                      >
                        <config.icon class="size-4" />
                      </div>
                      <span class="text-foreground-l1 truncate text-sm font-medium">
                        {config.name}
                      </span>
                    </div>
                    <span class="text-foreground-l4 shrink-0 text-xs tabular-nums">
                      {formatNumber(category.solveCount)} solves - {formatNumber(
                        category.challengeCount
                      )} challs
                    </span>
                  </div>
                  <div class="bg-background-l3 h-2 overflow-hidden rounded-full">
                    <div
                      class="bg-category-foreground-l0 h-full rounded-full"
                      style="{getCategoryStyle(config.color)} width: {barWidth(
                        category.solveCount,
                        maxCategorySolves
                      )}%;"
                    ></div>
                  </div>
                </div>
              {/each}
            {/if}
          </Section.Content>
        </Section.Root>
      </div>

      <Section.Root class="bg-background-l1">
        <Section.Header>Recent solves</Section.Header>
        <Section.Content class="grid gap-2 md:grid-cols-2">
          {#if stats.recentSolves.length === 0}
            <EmptyState
              icon={IconTrophyFilled}
              title="No solves yet"
              class="min-h-48 md:col-span-2"
            />
          {:else}
            {#each stats.recentSolves as solve}
              {@const category = getCategoryConfig(solve.challengeCategory)}
              <div class="bg-background-l2 flex items-center gap-3 rounded-lg p-3">
                <div
                  class="bg-category-background-l0 text-category-foreground-l0 shrink-0 rounded-lg p-2"
                  style={getCategoryStyle(category.color)}
                >
                  <IconTrophyFilled class="size-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-foreground-l1 truncate text-sm font-medium">
                    {solve.userName}
                  </div>
                  <div class="text-foreground-l4 truncate text-sm">
                    {solve.challengeName} - {formatLocalTime(new Date(solve.createdAt).getTime())}
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </Section.Content>
      </Section.Root>

      {#if stats.teams.admins > 0}
        <div class="text-foreground-l4 flex items-center justify-center gap-2 text-sm">
          <IconShieldFilled class="size-4" />
          {formatNumber(stats.teams.admins)} admin account{stats.teams.admins === 1 ? '' : 's'}
        </div>
      {/if}
    </div>
  </ScrollArea>
{:else if isPending}
  <div class="flex flex-1 items-center justify-center">
    <Spinner class="size-4" />
  </div>
{:else}
  <div class="flex flex-1 items-center justify-center p-4">
    <div class="w-full max-w-md">
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-xl">Statistics</Card.Title>
        </Card.Header>
        <Card.Content>
          <p class="text-foreground-l3">
            {error ?? 'Failed to load statistics.'}
          </p>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
{/if}
