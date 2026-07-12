# Security policy

rCTF is a platform for hosting capture-the-flag competitions. This page covers where to send reports, who we trust, and what counts as a vulnerability.

## Reporting a vulnerability

Found something? Email [rctf@osec.io](mailto:rctf@osec.io). Don't open a public issue or discussion for security reports.

A good report includes a proof of concept against a local deployment (`bun dev` or the bundled `compose.yml`), the affected component, and the role needed to exploit it. Test against instances you run yourself, never against someone else's live event.

We support the latest release and the `main` branch. Reports against older releases are welcome, but fixes land on `main` and ship with the next release.

## Trust model

Whether something counts as a vulnerability mostly comes down to who the attacker has to be. rCTF splits actors into four tiers.

| Actor                                                                          | Trust         |
| ------------------------------------------------------------------------------ | ------------- |
| Operators (config files, environment, database, Redis, shared service secrets) | Fully trusted |
| Admins (any user with a non-zero `perms` bitmask)                              | Fully trusted |
| Players (registered teams, `perms = 0`) and unauthenticated visitors           | Untrusted     |
| Challenge workloads (instancer containers, traffic from deployed challenges)   | Hostile       |

### Admins are trusted

Every admin permission, `challsRead` through `settingsWrite`, is equally trusted. Admin input is trusted by design, even where it can clearly do damage.

- Admin bot challenge source is arbitrary TypeScript that the admin bot service builds and executes. That's a feature.
- Admin uploads are served to players as-is.
- The Kubernetes and Docker instancers expose "privileged" challenge fields (custom images, host mounts, privileged pods and containers) as deliberate extension points.

Three things still count even when the attacker is an admin.

- Privilege escalation across permission bits, e.g. `challsRead` => `settingsWrite`. Anything with the same effect as a permission you don't hold counts too, like deleting solves without `challsSolveWrite`.
- Escalation from admin to operator. That means reading config-file secrets (`tokenKey`, database credentials, provider keys), forging tokens, or running code on the API process through any admin permission. The admin bot service and instancer workloads don't count here; they execute admin-supplied code by design.
- XSS. Admins author markdown/HTML that players see (challenge descriptions, home content, settings), but the renderer is expected to keep script out of the page.

## In scope

Everything in this list assumes a player or unauthenticated attacker.

- Gaining any admin permission bit, or any effect equivalent to one.
- Forging or decrypting auth/team/verify tokens, confusing one token kind for another, bypassing login or email verification, and problems in the CTFtime OAuth handoff or the external-auth (challenge OAuth) flows, such as weak redirect validation or token leakage.
- CSRF, clickjacking, CSP bypass, open redirects, and similar browser boundary flaws, when they lead to token disclosure, privilege use, or session compromise.
- IDOR, missing permission or division checks, touching another team's resources (solves, members, instances, admin bot jobs, uploads), or reading data meant for other roles.
- SQL injection, command injection, path traversal, and header injection.
- Any XSS, wherever it fires and whoever can place the payload, admins included.
- Server-side requests driven by player-controlled input (SSRF).
- Logic bugs like score or solve manipulation, dynamic-scoring manipulation, flag-check bypass, flag leaks, solving outside the competition window without the bypass permissions, seeing challenges before the competition starts, double solves, or scoring races.
- Forged or replayed requests to the dynamic-scoring webhook (`/api/v2/challs/:id/scores`) that get past the `X-RCTF-Timestamp` / `X-RCTF-Signature` checks.
- Getting around the rate limits or captchas on any endpoint.
- Leaked emails, auth or team tokens, flags, hidden or unreleased challenge data, or any other non-public state.
- Reaching the admin bot worker or instancer service APIs without the shared secret, or abusing service-to-service trust from a player position.
- Weaknesses in token encryption or any other cryptography in the project.
- Bundled deployment material or documented walkthroughs that produce an insecure deployment when followed as written.
- GitHub Actions or release configuration flaws that can affect published container images, package cleanup, build provenance, repository secrets, or any other part of the release process.

The in-scope components are `apps/api`, `apps/web`, `apps/admin-bot`, `apps/docker-instancer`, `apps/k8s-operator`, and all `packages/*`. Also the bundled `compose.yml` plus everything under `deploy/`, meaning the production container build (Dockerfile, nginx, supervisord), the service compose files, the Traefik configs, and the Terraform modules and examples in `deploy/terraform/`.

Release-relevant GitHub Actions under `.github/workflows/` and `.github/actions/` are in scope too, and so is deployment or configuration guidance in the official docs, including installation walkthroughs, provider docs, the configuration reference, the upload, captcha, email, analytics, and instancer guides, and the VPS setup series.

## Out of scope

- Anything that needs operator access (config files, environment variables, the database, Redis, or the shared service secrets). Findings that need admin permissions are also out, except the cases listed under the trust model.
- Social engineering, phishing, and anything that needs physical access.
- Dependency CVEs without a reachable exploit path in rCTF.
- Issues confined to development tooling and example configuration (`compose.dev.yml`, README snippets, `apps/cli`, `tests/`), or to the documentation site itself (`apps/docs`). Insecure deployment or configuration guidance in the docs content is the exception; that is in scope.
- Account or email enumeration through registration and recovery responses.
