---
title: Admin panel
description: Overview of rCTF administration, permissions, and settings management.
order: 5
---

The rCTF admin panel handles challenge management, user administration, and platform settings from the web interface.

## Permissions

rCTF uses a bitwise permission system. Each permission is a flag, and you combine them to build different admin roles.

| Permission         | Value | Description                                         |
| ------------------ | ----- | --------------------------------------------------- |
| `challsRead`       | 1     | View challenges in admin panel                      |
| `challsWrite`      | 2     | Create, update, and delete challenges               |
| `leaderboardRead`  | 4     | View leaderboard data (required for CTFtime export) |
| `challsSolveWrite` | 8     | Delete solves                                       |
| `usersWrite`       | 16    | Manage users and generate team tokens               |
| `settingsWrite`    | 32    | Modify platform settings                            |

A full admin has all permissions combined for a total of `1 + 2 + 4 + 8 + 16 + 32 = 63`.

### Creating admin accounts

After registering a normal account, grant admin permissions via the database:

```sql
-- Full admin (all permissions)
UPDATE users SET perms = 63 WHERE email = 'admin@example.com';

-- Challenge editor (read + write challenges)
UPDATE users SET perms = 3 WHERE email = 'author@example.com';
```

If using Docker:

```console
$ <red>docker</red> exec <dim>-it</dim> rctf-postgres-1 bash
$ <red>psql</red> <dim>-U</dim> rctf
UPDATE users SET perms = 63 WHERE email = 'admin@example.com';
```

:::warning
Permission changes take effect once the user cache expires (30 seconds) or when the user updates their profile. You don't need to restart the server.
:::

### Permission bypass

Users with the right permissions can bypass competition timeline restrictions. A user with `challsRead`, for example, can view challenges before the CTF starts.

## Runtime settings

You can change platform settings at runtime without restarting the server. This requires the `settingsWrite` permission.

Editable settings:

| Setting           | Description                                 |
| ----------------- | ------------------------------------------- |
| CTF name          | Display name of the competition             |
| CTF start time    | Competition start time                      |
| CTF end time      | Competition end time                        |
| Home content      | Home page markdown content                  |
| Sponsors          | Sponsor list (name, icon, description, URL) |
| Meta description  | HTML meta description                       |
| Meta image URL    | HTML meta image URL                         |
| Favicon URL       | Browser favicon                             |
| Logo (light/dark) | Platform logos for light and dark mode      |

These settings override values from the config files. Setting a value to `null{:ts}` reverts to the config file default.

Start and end time overrides have to keep the start before the end. Runtime timing overrides are returned through the v2 client config.
