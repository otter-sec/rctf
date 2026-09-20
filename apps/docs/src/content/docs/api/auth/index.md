---
title: "Authentication"
description: "Registration, verification, recovery, login, and token validation routes."
order: 10
scroll: true
aside: true
---

:::aside

| Route | Endpoint |
| --- | --- |
| [Register a team](/api/auth/register/) | `<route>POST /api/[v2,v1]/auth/register</route>` |
| [Verify a token](/api/auth/verify/) | `<route>POST /api/[v2,v1]/auth/verify</route>` |
| [Recover an account](/api/auth/recover/) | `<route>POST /api/[v2,v1]/auth/recover</route>` |
| [Preview a verification token](/api/auth/verify-info/) | `<route>GET /api/v2/auth/verify-info</route>` |
| [Log in with a password](/api/auth/login/) | `<route>POST /api/v2/auth/login</route>` |
| [Log in with a token](/api/auth/login/) | `<route>POST /api/v1/auth/login</route>` |
| [Test an auth token](/api/auth/test/) | `<route>GET /api/v1/auth/test</route>` |

:::

Authentication in rCTF is based around teams. A team owns the name, email address, score, solves, members, and settings. Browser sessions and API clients act on behalf of a team by sending an auth token in the `Authorization` header.

The API has both V1 and V2 routes. They are available together, and a client may need routes from both versions. V2 routes exist where behavior changed or new response data was added. V1 routes remain current when there is no V2 replacement.

Most authenticated API requests use the `Authorization: Bearer <dim><auth-token></dim>` header.

The other token kinds are used while setting up, recovering, or changing a team account.

| Token kind    | Lifetime             | Used by                                                         |
| ------------- | -------------------- | --------------------------------------------------------------- |
| `Auth`        | No expiry, revocable | `Authorization: Bearer <dim><auth-token></dim>` on user routes. |
| `Team`        | No expiry, revocable | Account recovery, login, and token verification.                |
| `Verify`      | `loginTimeout`       | Email updates and pending registrations. Single use.            |
| `CtftimeAuth` | `loginTimeout`       | CTFtime registration and login handoff.                         |

Tokens are encrypted with AES 256 GCM using `tokenKey`. Rotating `tokenKey` invalidates any auth, team, verify, or CTFtime handoff token issued before the rotation.

Verify tokens also depend on a one time Redis marker. The encrypted token can still decrypt successfully after the marker has been used or expired, but the verification request will not complete.

## Token revocation

Every token carries the second it was minted. Each account carries a token epoch, stored as `users.token_epoch` in unix seconds and starting at `0`. An auth or team token whose mint time is at or before the account's epoch is dead, even though it still decrypts and has no expiry of its own.

Setting or removing a password raises the epoch to the current second, so a credentials change ends every session the account had, not just the one that made the change. That is why [set password auth](/api/users/set-password/) and [remove password auth](/api/users/delete-password/) return a replacement `authToken`: the token used to make the request is revoked along with the rest.

The check runs at every point where a token is redeemed, not only on the `Authorization` header:

| Redemption point | Rejected with |
| --- | --- |
| `Authorization: Bearer <dim><auth-token></dim>` on any authenticated route | `<response>401 badToken</response>` |
| Team token on `<route>POST /api/v1/auth/login</route>` | `<response>401 badTokenVerification</response>` |
| Team token on `<route>POST /api/[v2,v1]/auth/verify</route>` | `<response>401 badTokenVerification</response>` |

Checking only the header would not be enough. Team tokens never expire and `<route>GET /api/v2/users/me</route>` mints a fresh one on every call, so a revoked session could otherwise trade its team token for a new auth token.

Two limits are worth stating plainly. The epoch has one second of resolution, and an [external-auth](/api/external-auth/) authorization code that was already issued can still be exchanged for an access token during its 60 second lifetime, because the exchange does not consult the epoch.

Nothing other than a password change raises the epoch. Rotating `tokenKey` remains the only way to invalidate tokens for every account at once.

## Credential strength

A password is an additional way to obtain an auth token, not a stronger one. [Account recovery](/api/auth/recover/) still emails a team token that never expires, so access to a team's mailbox is still full access to the account whether or not a password is set. Removing that risk means not configuring an email provider, which in turn removes the only self-service recovery path.

:::note[Version choice]

For new clients, prefer the V2 route when both V1 and V2 exist for the same action. V2 uses the
  newer captcha field name and returns more response data. V1 remains useful for actions that do not
  have a V2 route, such as logging in with a team token or testing an auth token.

:::
