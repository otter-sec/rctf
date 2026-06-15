---
title: Installation
description: Deploy rCTF in minutes with Docker or set it up manually.
order: 1
---

You can have rCTF running in minutes with the automated installation script, or set it up manually for more control over the environment.

For production, plan on a VPS with at least 2 CPU cores and 4 GiB RAM. The [Setting Up a CTF Platform](/docs/meta/running-a-successful-ctf/setup) guide walks through the full deployment, including Nginx, TLS, and firewall configuration.

## Quick start with Docker

The fastest way to get rCTF running is the automated installation script:

```console
$ <red>curl</red> <dim>-L</dim> https://get.rctf.osec.io | <red>sh</red>
```

The script installs rCTF to `/opt/rctf/{:dir}` with Docker Compose, including PostgreSQL, Redis, and the rCTF server. When prompted, answer `y` to start the platform immediately.

After installation, configure your instance by editing the YAML files in `/opt/rctf/rctf.d/{:dir}`. At minimum, set `<red>ctfName</red>`, `<red>origin</red>`, `<red>startTime</red>`, and `<red>endTime</red>` (see [Configuration](/docs/configuration) for the full reference). Once the config is in place, apply the changes by rebuilding the stack:

```console
$ <red>cd</red> /opt/rctf && <red>docker</red> compose up <dim>-d</dim> <dim>--force-recreate</dim> <dim>--build</dim>
```

Re-run that command after every config change.

See [Configuration](/docs/configuration) for the full reference of available options.

## Next steps

- [Manual installation](/docs/installation/manual) for development or custom deployments
- [Configuration](/docs/configuration) for the full configuration reference
- [Upgrading from v1](/docs/installation/upgrading) if migrating from an older version
