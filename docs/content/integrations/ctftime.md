# CTFtime

## OAuth

To allow teams to login via their CTFtime teams, you need an event on CTFtime. You can [register for one here](https://ctftime.org/event/mail/).

In the OAuth endpoint field on the event editing page, enter:

```
https://your-rctf.example.com/integrations/ctftime/callback
```

Copy the client ID and client secret and place them in `ctftime.clientId` and `ctftime.clientSecret` or `RCTF_CTFTIME_CLIENT_ID` and `RCTF_CTFTIME_CLIENT_SECRET`.

```yaml
ctftime:
  clientId: 123
  clientSecret: abcd
```

## Exporting Leaderboard

After the CTF is over, you can export the CTFtime leaderboard format by using the `https://your-rctf.example.com/api/v1/integrations/ctftime/leaderboard` endpoint using credentials that have `perms` set to at least 4. You can grab
the authentication token by visiting your rCTF instance's home page using the previously mentioned credentials and running `localStorage.getItem('token')` in the browser console. Then, you can replace `[TOKEN]` with the token and run the following command to get the leaderboard export:

```bash
curl https://your-rctf.example.com/api/v1/integrations/ctftime/leaderboard \
  -H "Authorization: Bearer [TOKEN]"
```
