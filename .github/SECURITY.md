# Security policy

rCTF is a platform for hosting capture-the-flag competitions. This page covers who we trust, what counts as a vulnerability, and where to send reports.

## Reporting a vulnerability

Found something? Email [rctf@osec.io](mailto:rctf@osec.io). Don't open a public issue or discussion for security reports.

A good report includes a proof of concept against a local deployment (`bun dev` or the bundled `compose.yml`), the affected component, and the role needed to exploit it. Test against instances you run yourself, never against someone else's live event.

We support the latest release and the `main` branch. Reports against older releases are welcome, but fixes land on `main` and ship with the next release.

## Trust model

Whether something counts as a vulnerability mostly comes down to who the attacker has to be. rCTF splits actors into four tiers:

| Actor                                                                          | Trust         |
| ------------------------------------------------------------------------------ | ------------- |
| Operators (config files, environment, database, Redis, shared service secrets) | Fully trusted |
| Admins (any user with a non-zero `perms` bitmask)                              | Fully trusted |
| Players (registered teams, `perms = 0`) and unauthenticated visitors           | Untrusted     |
| Challenge workloads (instancer containers, traffic from deployed challenges)   | Hostile       |

### Admins are trusted

Every admin permission, `challsRead` through `settingsWrite`, is equally trusted. Admin input is trusted by design, even where it can clearly do damage:

- Admin bot challenge source is arbitrary TypeScript that the admin bot service builds and executes. That's a feature, not remote code execution.
- Admin uploads are served to players as-is.
- The Kubernetes and Docker instancers expose "privileged" challenge fields: custom images, host mounts, privileged pods and containers. That's deliberate extensibility, not a vulnerability.

Three things still count even when the attacker is an admin:

- Privilege escalation across permission bits, e.g. `challsRead` => `settingsWrite`. Anything with the same effect as a permission you don't hold counts too: deleting solves without `challsSolveWrite`, managing users or generating team tokens without `usersWrite`, editing runtime settings without `settingsWrite`.
- Escalation from admin to operator: reading config-file secrets (`tokenKey`, database credentials, provider keys), forging tokens, or running code on the API process through any admin permission. The admin bot service and instancer workloads don't count here; they execute admin-supplied code by design.
- XSS. Admins author markdown/HTML that players see (challenge descriptions, home content, settings), but the renderer is expected to keep script out of the page. Report XSS even when only an admin can place the payload.

### Players are not trusted

Everything a registered team or an anonymous visitor can reach is attack surface. **Escalating from player, or from no account at all, to any admin permission is in scope** and treated as high severity. Indirect paths count too: player-controlled content (team names, member data, admin bot job inputs) executing in an admin's browser session is still privilege escalation.

## In scope

What we want to hear about, assuming a player or unauthenticated attacker:

- **Privilege escalation**: gaining any admin permission bit, or any effect equivalent to one.
- **Authentication flaws**: forging or decrypting auth/team/verify tokens, confusing one token kind for another, bypassing login or email verification, and problems in the CTFtime OAuth handoff or the external-auth (challenge OAuth) flows, such as redirect validation or token leakage.
- **Browser boundary flaws**: CSRF, clickjacking, CSP bypass, open redirects, and similar, when they lead to token disclosure, privilege use, or session compromise.
- **Improper access control**: IDOR, missing permission or division checks, touching another team's resources (solves, members, instances, admin bot jobs, uploads), reading data meant for other roles.
- **Injection**: SQL injection, command injection, path traversal (in upload serving, for example), header injection.
- **XSS**: any cross-site scripting, wherever it fires and whoever can place the payload, admins included.
- **SSRF**: server-side requests driven by player-controlled input.
- **Logic bugs**: score or solve manipulation, dynamic-scoring manipulation, flag-check bypass, flag leaks, solving outside the competition window without the bypass permissions, seeing challenges before the competition starts, double solves, scoring races.
- **Dynamic-scoring webhook auth flaws**: forging, replaying, or bypassing the `X-RCTF-Timestamp` / `X-RCTF-Signature` checks on `/api/v2/challs/:id/scores`.
- **Rate-limit and captcha bypass**: getting around the protections on flag submission, registration, recovery, instancer, or admin bot endpoints.
- **Information disclosure**: leaked emails, auth or team tokens, flags, hidden or unreleased challenge data, or any other non-public state.
- **Service authentication bypass**: reaching the admin bot worker or instancer service APIs without the shared secret, or abusing service-to-service trust from a player position.
- **Cryptographic flaws**: weaknesses in token encryption or any other cryptography in the project.
- **Insecure deployment defaults and guidance**: bundled deployment material or documented walkthroughs that produce an insecure deployment when followed as written. Think exposed internal services, missing isolation between challenge workloads and platform infrastructure, or over-broad cloud IAM.
- **Release pipeline compromise**: GitHub Actions or release configuration flaws that can affect published container images, package cleanup, build provenance, repository secrets, or other release artifacts.

In-scope components: `apps/api`, `apps/web`, `apps/admin-bot`, `apps/docker-instancer`, `apps/k8s-controller`, and all `packages/*`. Also the bundled `compose.yml` plus everything under `deploy/`, meaning the production container build (Dockerfile, nginx, supervisord), the service compose files, the Traefik configs, and the Terraform modules and examples in `deploy/terraform/`. Release-relevant GitHub Actions under `.github/workflows/` and `.github/actions/` are in scope too, and so is deployment or configuration guidance in the official docs: installation walkthroughs, provider docs, the configuration reference, the upload, captcha, email, analytics, and instancer guides, and the VPS setup series.

## Out of scope

- Anything that needs operator access: config files, environment variables, the database, Redis, or the shared service secrets. Findings that need admin permissions are also out, except the cases listed under the trust model (permission-bit escalation, admin-to-operator escalation, and XSS).
- Vulnerabilities in CTF challenges themselves, and container escapes caused by a deployer's own challenge or infrastructure configuration. Challenge workloads are documented as hostile; isolating them (resource limits, unprivileged containers, network policy) is the deployer's job. Bugs in the instancer services, in first-party defaults, or in first-party deployment guidance that break that isolation from a player position are still in scope.
- Denial of service through sheer traffic volume. Single-request crashes and trivially asymmetric amplification are in scope.
- Behavior that is public by design. The challenge list and leaderboard are intentionally visible without an account, and flag submissions are intentionally unlimited, subject to rate limits (bypassing those is in scope). See [things we will not implement](../apps/docs/src/content/docs/meta/things-we-will-not-implement.mdx).
- Social engineering, phishing, and anything that needs physical access.
- Dependency CVEs without a reachable exploit path in rCTF.
- Issues confined to development tooling and example configuration (`compose.dev.yml`, README snippets, `apps/seed`, `apps/export`, `tests/`), to non-release CI and test workflows, or to the documentation site itself (`apps/docs`). Insecure deployment or configuration guidance in the docs content is the exception; that one is in scope.
- Account or email enumeration through registration and recovery responses.
