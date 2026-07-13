---
title: Challenges
description: Creating and managing challenges in rCTF.
order: 1
---

Create and manage challenges from `/admin/challs`.

## Creating and updating challenges

Every challenge has a unique ID and uses either decay or dynamic scoring. Changes that affect points automatically recalculate the leaderboard. See [Scoring](/admin/scoring) for both models and the dynamic score API.

## Challenge visibility

Challenges support two visibility controls:

- Setting **`<red>hidden</red>`** to **`true{:ts}`** completely hides the challenge from non-admin users.
- Setting **`<red>releaseTime</red>`** to a Unix-millisecond timestamp makes the challenge visible only after that moment. Set it to `null{:ts}` to make the challenge visible immediately when the CTF starts.

Together, these fields let you upload a challenge early without showing it to participants.

## File attachments

Upload challenge files separately under [Uploading](/admin/uploading), then reference them from the challenge. Each file records its display name, URL, and size.

## Deleting challenges

Deleting a challenge also removes its solves and recalculates the leaderboard.

:::warning
Challenge deletion is irreversible and removes all solve records for that challenge.
:::

## Instancer and admin bot configuration

Challenges can optionally include extra configuration blocks:

- **`<red>instancerConfig</red>`** holds the configuration for per-team instances. When set, it is validated against the instancer provider's schema. See [Instancer](/integrations/instancer) for details.
- **`<red>adminBotConfig</red>`** holds the trusted TypeScript handler for admin bot visits. The handler defines its inputs, validation, timeout, and browser behavior. See [Admin bot](/integrations/admin-bot) for the API.
