---
title: CLI
description: Operational command-line tool for deployment tasks, managing admin permissions, seeding demo data, and exporting archives.
order: 8
---

The `<red>rctf</red>` CLI bundles rCTF's operational tooling: deployment helpers, admin management, database seeding, and static exports.

## Invocation

From a source checkout, run it through the root script:

```ansi
$ <red><dim>bun</dim> rctf</red> user list-admins
```

The production Docker image includes `<red>rctf</red>` on `<yellow>PATH</yellow>`, so commands can run inside the container next to the live instance:

```ansi
$ <red>docker</red> exec rctf-rctf-1 <red>rctf</red> user list-admins
```

The CLI reads the same `rctf.d/{:dir}` configuration as the API, or the directory set by `<yellow>RCTF_CONF_PATH</yellow>`, and talks to the database and Redis directly.

## Commands

### `<red>rctf</red> config get`

Prints the resolved value at a dot-separated [configuration](/configuration) path.

```ansi
$ <red><dim>bun</dim> rctf</red> config get database.migrate
before
$ <red><dim>bun</dim> rctf</red> config get leaderboard.maxLimit
100
```

### `<red>rctf</red> user promote`

Grants permissions to the user with the given email. Without `<dim>--perms</dim>`, the command grants full admin access.

```ansi
$ <red><dim>bun</dim> rctf</red> user promote admin@example.com
$ <red><dim>bun</dim> rctf</red> user promote author@example.com <dim>--perms</dim> challsRead,challsWrite
```

| Flag | Default | Description |
| --- | --- | --- |
| `<dim>--perms</dim>` | all permissions | Comma-separated [permission names](/admin#permissions). |

### `<red>rctf</red> user demote`

Resets a user's permissions to zero.

```ansi
$ <red><dim>bun</dim> rctf</red> user demote author@example.com
```

### `<red>rctf</red> user list-admins`

Lists every user holding any permissions.

### `<red>rctf</red> user set-password`

Sets or resets a team's password. The argument is the team name, not the email address that `<dim>promote</dim>` and `<dim>demote</dim>` take.

```ansi
$ <red><dim>bun</dim> rctf</red> user set-password otter-sec
New password:
Confirm password:
Password set for 'otter-sec'. All previously issued tokens are now rejected.
```

The password is read from stdin and asked for twice. It is never taken from an argument, which would put it in shell history and in the process list. On a terminal the input is not echoed; when stdin is a pipe or a file the password is read as a plain line instead. It must be 8 to 128 characters; the command exits non-zero without touching the account if the two entries differ, if the length is out of range, or if no team has that name.

Setting a password raises the account's token epoch, so every auth and team token the team held stops working and its browser sessions are logged out.

This is the only account reset path on a deployment with no `<red>email</red>` provider configured. Without email, `<route>POST /api/v2/auth/recover</route>` returns `<response>404 badEndpoint</response>`, so a team that forgets its password has no way back in on its own.

### `<red>rctf</red> seed`

Wipes the database and fills it with demo data.

```ansi
$ <red><dim>bun</dim> rctf</red> seed
```

:::warning
Seeding deletes all users, challenges, solves, submissions, and settings. When `<yellow>NODE_ENV</yellow>=<green>production</green>`, the command refuses to run unless `<dim>--force</dim>` is passed.
:::

### `<red>rctf</red> export`

Exports a static, read-only archive of a running instance. See [Static export](/archiving) for the full flag reference.

### `<red>rctf</red> deployment generate-csp`

Generates nginx security-header directives from the current configuration and outputs it to stdout. The output includes a provider-aware `Content-Security-Policy{:http}` header plus `Referrer-Policy{:http}`, `X-Frame-Options{:http}`, and `X-Content-Type-Options{:http}`. The command reads Svelte's generated CSP directives from `<dim>--web-build</dim>` (default: `apps/web/build/{:dir}`), merges them with the runtime policy and any extra sources from the [`<red>csp</red>` config option](/configuration#csp), and removes duplicate sources.

The production container runs this command automatically at startup.

### `<red>rctf</red> deployment generate-avatar-body-limit`

Generates a nginx `client_max_body_size{:nginx}` directive for the avatar upload endpoint and outputs it to stdout. The limit is the [`<red>maxAvatarSize</red>` config option](/configuration#limits) plus headroom for the multipart request framing, so the proxy never rejects uploads the API would accept.

The production container runs this command automatically at startup.
