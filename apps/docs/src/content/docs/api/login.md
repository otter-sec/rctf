---
title: Log in
description: Exchange a team token for an auth token.
order: 3
---

:::aside
```sh title="Request"
$ curl https://api.example.com/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"teamToken": "team_8f2c…"}'
```

```json title="200 goodLogin"
{
  "kind": "goodLogin",
  "data": { "authToken": "auth_3a91…" }
}
```
:::

`<route>POST /v1/auth/login</route>` exchanges a longer-lived team credential
for an auth token usable on every authenticated route. No bearer header is
required to call it — the team token in the body *is* the credential. Token
verification happens before any account data is touched, so an expired or
forged token never mints an auth token.

## Request body

`teamToken` is the team's standing credential and is required unless you send a
`ctftimeToken` instead. Exactly one of the two must be present: `ctftimeToken`
is matched to the team linked to that CTFtime identity, while `teamToken`
authenticates the team directly. Sending neither is rejected before any lookup.

## Response fields

`authToken` is a fresh, short-path credential — pass it as
`Authorization: Bearer <authToken>` on user routes. It carries no expiry of its
own, but it is bound to the team it was minted for, so a rotated team token
does not retroactively invalidate auth tokens already in flight.

## Failure modes

An unrecognized team returns `<response>400 badUnknownUser</response>`. A token
that fails to decrypt or verify is `<response>400 badTokenVerification</response>`,
and a malformed CTFtime handoff is `<response>400 badCtftimeToken</response>`.
All three share the envelope, so a single error branch can read the `kind` and
route accordingly.
