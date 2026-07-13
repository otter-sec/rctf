---
title: Admin panel
description: Overview of rCTF administration, permissions, and settings management.
order: 5
---

The admin panel manages challenges, teams, solves, and runtime settings.

## Permissions

Each admin permission has a numeric value. Add the values together to grant several permissions to one account.

| Permission         | Value | Description                                         |
| ------------------ | ----- | --------------------------------------------------- |
| `challsRead`       | 1     | View challenges in admin panel                      |
| `challsWrite`      | 2     | Create, update, and delete challenges               |
| `leaderboardRead`  | 4     | View leaderboard data (required for CTFtime export) |
| `challsSolveWrite` | 8     | Delete solves                                       |
| `usersWrite`       | 16    | Manage users and generate team tokens               |
| `settingsWrite`    | 32    | Modify platform settings                            |

A full admin uses `63`, the sum of every permission.

### Creating admin accounts

After registering a normal account, grant admin permissions with the [rctf CLI](/admin/cli):

- For full admin:
   ```ansi
   $ <red><dim>bun</dim> rctf</red> user promote admin@example.com
   ```
- For challenge editors (read + write challenges):
   ```ansi
   $ <red><dim>bun</dim> rctf</red> user promote author@example.com <dim>--perms</dim> challsRead,challsWrite
   ```

If using Docker:

```ansi
$ <red>docker</red> exec rctf-rctf-1 <red>rctf</red> user promote admin@example.com
```

Use `$ <red>rctf</red> user demote <dim><email></dim>` to revoke all permissions and `$ <red>rctf</red> user list-admins` to see who currently has any.

### Permission bypass

Some permissions also bypass event timing. For example, `challsRead` can view released challenges before the CTF starts.

## Runtime settings

An account with `settingsWrite` can change the following settings without restarting rCTF.

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
