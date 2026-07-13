---
title: Submissions
description: Viewing and managing challenge submissions in rCTF.
order: 4
---

rCTF keeps accepted solves and a broader submission log. The admin panel can remove solves and inspect the IP history for flag attempts and admin bot jobs.

## Viewing solves

The solve list shows the team, timestamp, and placement for each accepted flag.

## Deleting solves

Admins with `challsSolveWrite` can remove a solve caused by cheating, a leaked flag, or an administrative mistake.

:::warning
Deleting a solve triggers an automatic leaderboard recalculation, and the team's score and rank update to match.
:::

## Submission tracking

Each solve records the submitter's IP address. The submissions table also records flag attempts and admin bot submissions, with filters for time, challenge, team, IP, submission type, and result. Use it to investigate activity such as several teams submitting the same flag from the same address.

## First bloods

The first three solves, ordered by timestamp, are first, second, and third blood. A configured [blood bot](/integrations/bloodbot) announces them automatically.
