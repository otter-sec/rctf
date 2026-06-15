---
title: "GET Leaderboard challenges"
description: "GET /api/v2/leaderboard/challs"
order: 4
---

:::aside

::route-example{def="GetLeaderboardChallengesRouteV2"}

:::

::route-meta{def="GetLeaderboardChallengesRouteV2"}

Returns challenge metadata for leaderboard visualizations.

This route uses the same CTF start time gate as the standings routes. Its optional bypass permission is `challsRead{:ts}` instead of `leaderboardRead{:ts}`.

::response-body{def="GetLeaderboardChallengesRouteV2" response="goodLeaderboardChallengesV2" title="Response fields"}

`data.challenges` is keyed by challenge ID. `firstSolvers` contains up to the first three team IDs for each challenge.
