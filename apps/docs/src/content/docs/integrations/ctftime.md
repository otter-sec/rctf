---
title: CTFtime
description: Configure CTFtime OAuth authentication and leaderboard export.
order: 1
---

The [CTFtime](https://ctftime.org) integration lets teams register or log in with CTFtime and exports the final standings in CTFtime's format.

## Setup

:::steps
1. **Create a CTF**

   You will receive a **client ID** (numeric) and a **client secret**.

   Set the callback URL to `https://your-ctf-domain.com/integrations/ctftime/callback`.

2. **Configure rCTF**

   ```yaml title="rctf.d/ctftime.yaml"
   ctftime:
     clientId: '12345'
     clientSecret: your-client-secret
   ```

   Or via environment variables:

   | Variable                          | Description                              |
   | --------------------------------- | ---------------------------------------- |
   | `RCTF_CTFTIME_CLIENT_ID{:sh}`     | CTFtime OAuth client ID (numeric string) |
   | `RCTF_CTFTIME_CLIENT_SECRET{:sh}` | CTFtime OAuth client secret              |

:::

## Authentication flow

1. The user clicks "Login with CTFtime" on the frontend
2. The browser redirects to CTFtime's OAuth authorization page
3. After approval, CTFtime redirects back with an authorization code
4. The frontend sends the code to the rCTF API
5. The API exchanges the code for a CTFtime access token and creates an rCTF CTFtime auth token

### Registration with CTFtime

A CTFtime registration includes the team name and CTFtime token. It does not require email verification.

### Login with CTFtime

For later logins, rCTF matches the CTFtime ID to the existing team and returns an rCTF auth token.

## Division ACL behavior

:::note
CTFtime authentication bypasses division ACLs because it does not provide the email address those rules need. CTFtime users can therefore select any division.
:::

## Leaderboard export

After the event, a user with `<green>leaderboardRead</green>` permission can export the standings as CTFtime JSON.

See [After the CTF](/meta/running-a-successful-ctf/after-ctf) for the full scoreboard submission procedure.
