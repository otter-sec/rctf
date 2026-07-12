---
title: CLI
description: Operational command-line tool for managing admin permissions, seeding demo data, and exporting archives.
order: 8
---

The `rctf{:sh}` CLI bundles rCTF's operational tooling: admin management, database seeding, and static exports.

## Invocation

From a source checkout, run it through the root script:

```console
$ <red>bun</red> rctf user list-admins
```

The production Docker image ships the CLI as `rctf{:sh}` on the PATH, so commands can run inside the container next to the live instance:

```console
$ <red>docker</red> exec rctf-rctf-1 rctf user list-admins
```

The CLI reads the same `rctf.d/{:dir}` configuration as the API (or `RCTF_CONF_PATH{:sh}`), and talks to the database and Redis directly.

## Commands

### user promote

Grants permissions to the user with the given email. Defaults to full admin; pass `<dim>--perms</dim>` for a narrower role.

```console
$ <red>bun</red> rctf user promote admin@example.com
$ <red>bun</red> rctf user promote author@example.com <dim>--perms</dim> challsRead,challsWrite
```

| Flag | Default | Description |
| --- | --- | --- |
| `<dim>--perms</dim>` | all permissions | Comma-separated [permission names](/admin#permissions). |

### user demote

Resets a user's permissions to zero.

```console
$ <red>bun</red> rctf user demote author@example.com
```

### user list-admins

Lists every user holding any permissions.

### seed

Wipes the database and fills it with demo data.

```console
$ <red>bun</red> rctf seed
```

:::warning
Seeding deletes all users, challenges, solves, submissions, and settings. When `NODE_ENV=production{:sh}`, the command refuses to run unless `<dim>--force</dim>` is passed.
:::

### export

Exports a static, read-only archive of a running instance. See [Static export](/archiving) for the full flag reference.
