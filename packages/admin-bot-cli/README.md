# Test an rCTF admin bot locally

Use this CLI to run an admin bot submission against your local instance of a challenge before sending it to the real bot. It runs the downloaded challenge config in the matching production admin-bot image, then shows you the same browser logs you would see on [rCTF](https://rctf.osec.io/).

## Quick start

Download the bot configuration file (eg. `bot.ts` or `admin-bot.ts`) from the rCTF challenge page, then run the following:

```sh
npx @rctf-v2/admin-bot-cli bot.ts
# or, with Bun
bunx --bun @rctf-v2/admin-bot-cli bot.ts
```

<details>

<summary>Global install</summary>

```sh
npm install --global @rctf-v2/admin-bot-cli
# or, with Bun
bun install --global @rctf-v2/admin-bot-cli
```

Then use `rctf-admin-bot` globally:

```
rctf-admin-bot bot.ts
```

</details>

`npx` ([Node.js 18 or newer](https://nodejs.org/)) includes a bundled [Bun](https://bun.sh/) version and `bunx` runs it directly.

> [!NOTE]  
> For the admin bot running in Docker to access `localhost`, [Host networking](https://docs.docker.com/engine/network/drivers/host/) must be enabled. This is checked at runtime.

## Options

The CLI prompts for each bot input interactively (with history support via <kbd>&uarr;</kbd>). You can also provide values through extra arguments. For example:

```sh
npx @rctf-v2/admin-bot-cli bot.ts https://attacker.tld/exploit
```

- [`--headful`](#show-the-browser-window) (aliases: `-g`, `--gui`): Makes the browser window GUI visible during a run. Useful for debugging a bot's actions
- `--local` (alias: `-L`): Run browser locally instead of through docker. Note that some behavior may differ from the remote admin bot
- `--live` (alias: `l`): Print browser logs as they arrive, not at the end
- `--show` (alias: `-s`): Force enable all browser log hooks (console, dialog, error & navigation)
- `--restrict-domains` (alias: `-r`): Enforce the config's domain restrictions on local targets
- `--timeout` (alias: `-t`): Override the config run timeout in milliseconds (use `0` for unlimited)
- `--target` (alias: `-T`): Set the local challenge URL when it can't be discovered with `docker compose`
- `--verbose` (alias: `-v`): Show `extra` structured log details and non-fatal errors
- `--no-normalize` (alias: `-n`): Disable input RegEx conversion to localhost

Set the `FLAG` environment variable to override the default local flag (`rctf{local_test_flag}`). The `RCTF_ADMIN_BOT_IMAGE` environment variable allows you to adjust the image that is pulled, and `DISPLAY` is forwarded for headful runs.

## What happens

In a normal run, the CLI:

1. Checks Docker and pulls the `ghcr.io/otter-sec/rctf/admin-bot` image
2. Loads the given `bot.ts` to determine inputs and settings
3. Collects inputs and discovers the locally running instance with `docker compose` (for [`ctx.job.instancerInstances`](https://rctf.osec.io/integrations/admin-bot/#instancer-integration))
4. Runs the browser handler in a temporary container. Flag defaults to `rctf{local_test_flag}` and can be overridden with `FLAG` (for [`ctx.job.flags`](https://rctf.osec.io/integrations/admin-bot/#challenge-context))
5. Prints the logs and result

## Features

### Domain restrictions

When the config contains blocking `restrictDomains` rules, the CLI requires a local target. It tries to discover the target from Docker Compose and otherwise prompts for it; use `--target` for noninteractive runs or to select another URL.

The target's exact origin is allowed before evaluating the config's rules. Every other destination, including other localhost ports and URL inputs, remains subject to the original restrictions. The CLI prints a warning when it adds the target exception.

Pass `--restrict-domains` or `-r` to enforce the config unchanged, including for local targets. This may block the local challenge when the production rules allow only its public origin.

### Show the browser window

`--headful` shows the browser window. Docker mode requires an X11 display; `--headful --local` launches the browser directly on the host instead.

<details>
<summary>Linux (X11 or XWayland)</summary>

Run from a graphical session with `DISPLAY` set:

```sh
npx @rctf-v2/admin-bot-cli bot.ts --headful
```

For a local display, the CLI forwards the X11 socket and, when present, Xauthority automatically. A TCP `DISPLAY` address is passed through unchanged.

</details>

<details>
<summary>Windows with WSLg</summary>

Run the CLI inside a [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) distribution with [Docker Desktop integration](https://docs.docker.com/desktop/features/wsl/) enabled:

```sh
npx @rctf-v2/admin-bot-cli bot.ts --headful
```

The CLI forwards WSLg's `DISPLAY` and X11 socket automatically.

</details>

<details>
<summary>macOS with XQuartz</summary>

Install [XQuartz](https://www.xquartz.org/), then enable its TCP listener and restart it:

```sh
osascript -e 'quit app "XQuartz"' 2>/dev/null || true
defaults write org.xquartz.X11 nolisten_tcp -bool false
open -a XQuartz
```

After XQuartz starts, allow local clients and run the CLI:

```sh
/opt/X11/bin/xhost +localhost
npx @rctf-v2/admin-bot-cli bot.ts --headful
```

Revoke access afterward:

```sh
/opt/X11/bin/xhost -localhost
```

</details>

<details>
<summary>Windows without WSL</summary>

Start an X server such as [VcXsrv](https://sourceforge.net/projects/vcxsrv/), [GWSL](https://opticos.github.io/gwsl/), or [X410](https://x410.dev/), allow connections from Docker Desktop, then run:

```powershell
npx @rctf-v2/admin-bot-cli bot.ts --headful
```

The container uses `host.docker.internal:0.0` by default. Set `DISPLAY` for another display number:

```powershell
$env:DISPLAY = "host.docker.internal:1.0"
npx @rctf-v2/admin-bot-cli bot.ts --headful
```

Use Windows Firewall to keep the X server off untrusted networks.

</details>

## rCTF Development

Build local docker image (changes under `apps/admin-bot/src/`):

```sh
docker build -t rctf-admin-bot:local -f deploy/admin-bot/Dockerfile .
```

Run with local docker image and local CLI build:

```sh
RCTF_ADMIN_BOT_IMAGE=rctf-admin-bot:local bun packages/admin-bot-cli/src/cli.ts bot.ts
```

Run tests:

```sh
bun run test:admin-bot-cli
bun run --filter @rctf-v2/admin-bot-cli typecheck
```
