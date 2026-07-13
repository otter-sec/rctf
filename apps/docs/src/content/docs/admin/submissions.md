---
title: Submissions
description: Viewing and managing challenge submissions in rCTF.
order: 4
---

A submission (solve) gets recorded when a team submits the correct flag for a challenge. Admins can view and manage solves from the admin panel, and review submission IP history for both flag submissions and admin bot submissions.

## Viewing solves

Admins can view solves for any challenge, including the team name, solve timestamp, and ranking information.

## Deleting solves

Admins with the `challsSolveWrite` permission can delete individual solves. Useful for handling cheating or accidental solves.

:::warning
Deleting a solve triggers an automatic leaderboard recalculation, and the team's score and rank update to match.
:::

## Submission tracking

Each solve records the submitter's IP address. The submissions table also records flag attempts and admin bot submissions, with filters for time, challenge, team, IP, submission type, and result. Use it to investigate activity such as several teams submitting the same flag from the same address.

## First bloods

The first three teams to solve a challenge are tracked as "bloods", recorded as **first blood** at index 0, **second blood** at index 1, and **third blood** at index 2.

Blood status comes from the solve timestamp. If a [blood bot](/integrations/bloodbot) is configured, it announces these milestones automatically as they're hit.
