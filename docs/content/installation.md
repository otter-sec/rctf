# Installation

You can install rCTF in one command with [the installer script](https://get.rctf.osec.io).

```bash
curl -L https://get.rctf.osec.io | sh
```

This installs rCTF into the `/opt/rctf` folder, where `/opt/rctf/rctf.d` contains all the configuration and the instance itself can be (re)started with the command:

```bash
docker compose up --force-recreate --build -d
```

The instance is accessible by default only from localhost:8080, and can be changed in `/opt/rctf/docker-compose.yml` and applying the changes by restarting the instance.

## After installation

To configure rCTF, see [the configuration doc](configuration.md).

To update the CTF's challenges, see [the admin doc](management/admin.md).

To scale up rCTF, see the [migration](management/migration.md) and [scaling](management/scaling.md) docs.
