---
title: "`<route>POST</route>` Log in"
description: "`<route>POST /api/[v2,v1]/auth/login</route>`"
order: 5
---

:::aside

::::tabs{sync="login-version"}

:::tab[V2]

::::route-example{def="LoginRouteV2" extra="BadJson,BadBody"}

```json body
{
  "name": "otter-sec",
  "password": "a-long-team-password"
}
```

::::

:::

:::tab[V1]

::route-example{def="LoginRoute" pick="teamToken" extra="BadJson,BadBody"}

:::

::::

:::

::route-meta{def="LoginRouteV2" rateLimit="Login buckets. Burst `10`, refill window `100000` ms per IP, plus burst `5`, refill window `150000` ms per identifier. Both are consumed before the password is checked."}

Both login routes hand back a `TokenKind.Auth{:ts}` token for use on user routes. They differ in what they accept. V2 takes a team name or an email address, together with a password. V1 takes a longer lived credential, either a team token or a CTFtime handoff token, and there is no V2 replacement for that exchange, so V1 remains current.

::::tabs{sync="login-version"}

:::tab[V2]

`<route>POST /api/v2/auth/login</route>` authenticates with an identifier and a password.

`identifier` is matched against both the team name and the email address, so a team can sign in with either. It is trimmed and lowercased; both columns compare case-insensitively, `name` because it is `citext{:sql}` and `email` because it is stored normalized.

One string can name two accounts. Team names may contain `@`, and the two columns are unique only within themselves, so a team may be *named* `team@example.com` while a different team *holds* `team@example.com` as its address. The lookup resolves this in favor of the account that holds the address. A team named after someone else's email cannot shadow their login.

::request-body{def="LoginRouteV2" title="Request body"}

#### Response

A successful login returns `<response>200 goodLogin</response>` with a fresh `authToken`.

Every failure returns the same `<response>401 badCredentials</response>`: unknown identifier, wrong password, and an account that exists but has no password set. This is deliberate. The endpoint does not disclose which teams exist or which of them use a password. The two paths with no hash to check against verify the submitted password against a dummy hash instead, so all three failures take the same time as a real check.

::response-body{def="LoginRouteV2" response="goodLogin" title="Response fields"}

:::

:::tab[V1]

`<route>POST /api/v1/auth/login</route>` exchanges a longer lived team credential for an auth token.

::request-body{def="LoginRoute" title="Request body"}

`teamToken` is parsed as `TokenKind.Team{:ts}`. `ctftimeToken` is parsed as `TokenKind.CtftimeAuth{:ts}` and then matched to a team linked to that CTFtime ID.

#### Response

A successful login returns `<response>200 goodLogin</response>` with a fresh `authToken`. Token verification happens before any account data is returned, so expired, malformed, unrecognized, or [revoked](/api/auth#token-revocation) handoff tokens never mint an auth token.

::response-body{def="LoginRoute" response="goodLogin" title="Response fields"}

:::

::::

## Abuse controls on password login

Captcha on `login{:ts}` only applies when the deployment configures a captcha provider. On a deployment without one, the controls are the per-IP rate limit and a server-side cap of four concurrent password verifications, which keeps a flood of login attempts from starving the rest of the API.

The per-identifier bucket is a soft lockout. Because it is keyed on the submitted identifier rather than on the caller, anyone can keep a given team's login bucket drained and hold that team at `<response>429 badRateLimit</response>`. This is a deliberate trade: without it, guessing one team's password would be limited only by the attacker's supply of IP addresses. Clients should show `data.timeLeft` rather than reporting a failed password.

Team names are public on the leaderboard, so a list of valid identifiers is known. There is no account lockout and no strength rule beyond the length range, so these buckets are the only control on online guessing.
