---
title: Static export
description: Generate a read-only static snapshot of a finished rCTF instance for indefinite hosting on Cloudflare Pages or GitHub Pages.
order: 8
---

The `rctf export{:sh}` command of the [rctf CLI](/admin/cli) turns a running rCTF instance into a read-only static site. It preserves challenges, profiles, solves, the leaderboard, and uploaded files without requiring a database or API server.

## CLI

The exporter runs against a live rCTF API. Build the SvelteKit frontend first so a static `apps/web/build/{:dir}` exists, then invoke the export command:

```console
$ <red>bun</red> run <dim>--filter</dim> <green>'@rctf/web'</green> build
$ <red>bun</red> rctf export \
  <dim>--api-url</dim> https://ctf.example.com \
  <dim>--backend</dim> cloudflare-pages \
  <dim>--output</dim> ./export-output
```

| Flag | Default | Description |
| --- | --- | --- |
| `<dim>--api-url</dim>` | required | Base URL of the live rCTF instance to crawl. |
| `<dim>--backend</dim>` | required | Target host. One of `<green>cloudflare-pages</green>` or `<green>github-pages</green>`. |
| `<dim>--web-build</dim>` | `apps/web/build/{:dir}` | Pre-built SvelteKit frontend that is copied into the output. |
| `<dim>--output</dim>` | `./export-output/{:dir}` | Destination directory. Wiped and recreated on every run. |
| `<dim>--concurrency</dim>` | `5{:ts}` | Concurrent in-flight API requests during the discovery phase. |
| `<dim>--skip-uploads</dim>` | off | Skips downloading challenge files and avatars. URL rewriting is skipped with it. |

The output directory is deleted before each run. Point `<dim>--output</dim>` somewhere that does not contain other files.

## What the exporter collects

The discovery phase fetches:

- `<route>/api/v2/integrations/client/config</route>` with `<red>isArchived</red>` patched to `true{:ts}`.
- `<route>/api/v2/challs</route>` and `<route>/api/v2/leaderboard/challs</route>`.
- The full leaderboard and graph, paginated and merged into a single `api-data/v2/leaderboard/dump.json{:file}`.
- One `<route>/api/v2/users/:id</route>` response per unique user seen on the leaderboard.
- Every challenge's paginated solves, merged into one `api-data/v2/challs/:id/solves.json{:file}` per challenge.
- A static `<response>401 badToken</response>` stub for `<route>/api/v2/users/me</route>` so the frontend stays in a logged-out state.

Unless `<dim>--skip-uploads</dim>` is passed, every challenge file URL, avatar URL, sponsor icon, favicon, logo, and OG image is downloaded. Anything under `/uploads/{:dir}` is mirrored to the same path. Absolute URLs (S3, Discord CDN, and similar) are hashed and stored under `uploads/external/<hash>/<filename>{:file}`, and the JSON files in `api-data/{:dir}` are rewritten to point at the local copies so the archive is self-contained.

## Output layout

The resulting directory is ready to upload to a static host:

:::file-tree
- export-output/
  - index.html SvelteKit shell with the fetch interceptor injected
  - 404.html Copy of index.html for SPA fallback
  - index.html.gz
  - index.html.br
  - _app/ SvelteKit build assets
  - api-data/ Static API responses
    - v2/
      - challs.json
      - leaderboard/
        - dump.json Full leaderboard + graph for client-side filtering
      - users/
        - [id].json
      - challs/
        - [id]/
          - solves.json
  - uploads/ Mirrored /uploads/ and uploads/external/[hash]/
  - _redirects cloudflare-pages only
  - _headers cloudflare-pages only
  - wrangler.toml cloudflare-pages only
  - .nojekyll github-pages only
:::

The injector also strips the `Content-Security-Policy{:http}` meta tag from `index.html{:file}` so the inline interceptor script can execute on the static host.

## Deployment

The exporter prints the matching deploy command on success.

::::tabs
:::tab[Cloudflare Pages]
The `cloudflare-pages` backend writes:

- `_redirects{:file}` with `/* /index.html 200` so SvelteKit's client-side routes resolve.
- `_headers{:file}` setting `Cache-Control: public, max-age=31536000, immutable{:http}` on `/api-data/*`, `/uploads/*`, and `/_app/*`, plus `Access-Control-Allow-Origin: *{:http}` on `/api-data/*`.
- `wrangler.toml{:file}` with a placeholder `name = "rctf-archive"` and `pages_build_output_dir = "."`. Edit the name before deploying.

Deploy from the output directory:

```console
$ <red>npx</red> wrangler pages deploy ./export-output
```
:::
:::tab[GitHub Pages]
The `github-pages` backend writes an empty `.nojekyll{:file}` so files under `_app/{:dir}` are served instead of being filtered by Jekyll.

Publish with `$ <red>gh-pages</red>` from the repository root. The `<dim>--dotfiles</dim>` flag is required so `.nojekyll{:file}` is uploaded:

```console
$ <red>npx</red> gh-pages <dim>-d</dim> ./export-output <dim>--dotfiles</dim>
```

Pages served from a project subpath (`username.github.io/repo`) need a custom domain or root deployment, since the injected interceptor and SvelteKit build both assume the site is served from `/`.
:::
::::

## Runtime behavior

The injected script wraps `window.fetch{:ts}` and routes `<route>/api/*</route>` calls through static files:

- Any non-`<route>GET</route>` request returns `<response>405 Method Not Allowed</response>` with `"kind": "badEndpoint"{:json}` and the message `"This is a read-only archive."{:json}`. Login, registration, flag submission, profile edits, and admin actions all fail with this response.
- `<route>/api/v2/leaderboard/with-graph</route>`, `<route>/api/v2/leaderboard/now</route>`, and `<route>/api/v2/leaderboard/graph</route>` are answered from `dump.json{:file}` with in-memory `<red>division</red>` filtering, `<red>search</red>` substring matching, and `<red>offset</red>` / `<red>limit</red>` slicing. The scoreboard stays searchable without a backend.
- `<route>/api/v2/challs/:id/solves</route>` is sliced from each challenge's `solves.json{:file}`.
- `<route>/api/v2/integrations/analytics/script</route>` returns an empty `<response>404</response>` so the archived bundle does not ping a third-party analytics provider.
- Every other `<route>/api/*</route>` `<route>GET</route>` is rewritten to `/api-data/<path>.json{:file}` and served from the static bundle. Missing files return a `<response>404 badEndpoint</response>`.

The frontend reads `<red>isArchived</red>` from the client config and hides interactive controls (flag submission, profile edits, account creation) in the UI.

## Limitations

:::warning[Read-only by design]
The archive contains every JSON response the exporter saw at crawl time. Anything that requires authentication, server state, or live computation is absent.
:::

- No login, registration, password recovery, or token issuance. `<route>/api/v2/users/me</route>` always returns `<response>401 badToken</response>`.
- No admin pages. Admin endpoints require an authenticated session that the archive cannot produce.
- No live updates. The leaderboard reflects the moment the exporter ran. Re-run the export to refresh.
- No instancer, admin bot, or CTFtime export. Those depend on the live API and external services.
- Captcha, analytics, and any other integration that calls back to the API or a third party is disabled.

Re-run the exporter against the live instance to refresh the snapshot. The output directory is rebuilt from scratch on every invocation.
