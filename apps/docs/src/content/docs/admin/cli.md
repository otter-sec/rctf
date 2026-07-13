---
title: CLI
description: Operational command-line tool for managing admin permissions, seeding demo data, and exporting archives.
order: 8
---

The `<red>rctf</red>` CLI bundles rCTF's operational tooling: admin management, database seeding, and static exports.

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

### `<red>rctf</red> user promote`

Grants permissions to the user with the given email. Defaults to full admin; pass `<dim>--perms</dim>` for a narrower role.

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
