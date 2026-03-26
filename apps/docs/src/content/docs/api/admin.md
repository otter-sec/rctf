---
title: Administration
description: How rCTF administration works - permissions, challenge management, user management, and runtime settings.
---

For an overview of the permission system and how to create admin accounts, see the [Admin Panel](/admin) documentation.

## Challenge management

Admins with `challsWrite` permission can create, update, and delete challenges.

Key behaviors:

- **Leaderboard recalculation** - Creating, updating, or deleting a challenge triggers an automatic leaderboard recalculation
- **Instancer validation** - When a challenge includes instancer configuration, it is validated against the instancer provider's config schema
- **Admin bot validation** - When a challenge includes admin bot configuration, it is validated by the admin bot provider to ensure the code is loadable

## User management

Admins with `usersWrite` permission can:

- **List and search teams** - Browse all registered teams with pagination and fuzzy name search
- **Generate team tokens** - Create a login token for any non-privileged team (teams with `perms = 0`). This is useful for helping teams that have lost access to their account.

:::caution
Token generation is restricted to non-privileged users. You cannot generate tokens for admin accounts, preventing privilege escalation.
:::

## Solve management

Admins with `challsSolveWrite` permission can delete individual solves. This is useful for handling cheating or accidental solves. Deleting a solve triggers an automatic leaderboard recalculation.

## File uploads

Admins with `challsWrite` permission can upload challenge file attachments. See [Admin > Uploading](/admin/uploading) for details on how file uploads and deduplication work.

## Runtime settings

Admins with `settingsWrite` permission can modify certain platform settings at runtime without restarting the server. These runtime settings override values from the config files.

Editable settings:

| Setting           | Description                                 |
| ----------------- | ------------------------------------------- |
| CTF name          | Display name of the competition             |
| Home content      | Home page markdown content                  |
| Sponsors          | Sponsor list (name, icon, description, URL) |
| Meta description  | HTML meta description                       |
| Meta image URL    | HTML meta image                             |
| Favicon URL       | Browser favicon                             |
| Logo (light/dark) | Platform logos for light and dark mode      |

Setting a value to `null` reverts it to the config file default.

## Admin bot service

The admin bot runs as a separate service that communicates with the rCTF API using a shared secret key (service authentication) rather than user tokens. It polls for queued jobs, executes them in a browser context, and reports results back. See [Integrations](/integrations) for more on the admin bot.
