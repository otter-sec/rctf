# rCTF

## Prerequisites and setup

- Bun v1.0+

```bash
# db and dependencies
docker compose -f compose.dev.yml up -d
bun i

# config
cat <<EOT > rctf.d/00-development.yaml
ctfName: rCTF Development
meta:
  description: 'Example rCTF instance'
  imageUrl: 'https://example.com'
homeContent: 'A description of your CTF. Markdown supported.'

origin: http://127.0.0.1:8080
divisions:
  open: Open
tokenKey: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
startTime: 0
endTime: 99999999999999

# email:
#   from: no-reply@example.com
#   provider:
#     name: 'emails/smtp'
#     options:
#       smtpUrl: 'smtp://username:password@example.com'

database:
  sql:
    host: 127.0.0.1
    user: rctf
    password: DO_NOT_USE_ME
    database: rctf
  redis:
    host: 127.0.0.1
    password: DO_NOT_USE_ME
  migrate: before
EOT

# migrate the database
bun run db:migrate

# run the frontend + backend
bun run dev
```

rCTF v1 frontend with rCTF v2 backend:

- `bun run dev:api` in this repo
- `yarn workspace @rctf/client dev` in the old repo
- access [http://127.0.0.1:8080](http://127.0.0.1:8080)

## Roadmap

### Authentication

| Endpoint | Backend | Frontend |
|----------|:-------:|:--------:|
| `POST /api/v1/auth/register` | ✅ | ✅ |
| `POST /api/v1/auth/verify` | ✅ | ✅ |
| `POST /api/v1/auth/login` | ✅ | ✅ |
| `POST /api/v1/auth/recover` | ✅ | ✅ |
| `GET /api/v1/auth/test` | ✅ | — |

### Challenges

| Endpoint | Backend | Frontend |
|----------|:-------:|:--------:|
| `GET /api/v1/challs` | ✅ | ✅ |
| `POST /api/v1/challs/:id/submit` | ✅ | ✅ |
| `GET /api/v1/challs/:id/solves` | ✅ | ✅ |

### Admin

| Endpoint | Backend | Frontend |
|----------|:-------:|:--------:|
| `GET /api/v1/admin/challs` | ✅ | ✅ |
| `GET /api/v1/admin/challs/:id` | ✅ | ✅ |
| `PUT /api/v1/admin/challs/:id` | ✅ | ✅ |
| `DELETE /api/v1/admin/challs/:id` | ✅ | ✅ |
| `POST /api/v1/admin/upload` | ✅ | ✅ |
| `POST /api/v1/admin/upload/query` | ✅ | — |

### Leaderboard

| Endpoint | Backend | Frontend |
|----------|:-------:|:--------:|
| `GET /api/v1/leaderboard/now` | ✅ | ✅ |
| `GET /api/v1/leaderboard/graph` | ✅ | ✅ |

### Integrations

| Endpoint | Backend | Frontend |
|----------|:-------:|:--------:|
| `GET /api/v1/integrations/client/config` | ✅ | ✅ |
| `GET /api/v1/integrations/ctftime/leaderboard` | ✅ | — |
| `POST /api/v1/integrations/ctftime/callback` | ✅ | ✅ |

### Users

| Endpoint | Backend | Frontend |
|----------|:-------:|:--------:|
| `GET /api/v1/users/me` | ✅ | ✅ |
| `PATCH /api/v1/users/me` | ✅ | ✅ |
| `GET /api/v1/users/:id` | ✅ | ✅ |
| `GET /api/v1/users/me/members` | ✅ | ✅ |
| `POST /api/v1/users/me/members` | ✅ | ✅ |
| `DELETE /api/v1/users/me/members/:id` | ✅ | ✅ |
| `PUT /api/v1/users/me/auth/email` | ✅ | ✅ |
| `DELETE /api/v1/users/me/auth/email` | ✅ | ✅ |
| `PUT /api/v1/users/me/auth/ctftime` | ✅ | ✅ |
| `DELETE /api/v1/users/me/auth/ctftime` | ✅ | ✅ |

### Other Tasks (v1)

- [x] Run migrations programatically depending on the config value instead of just running in dockerfile entry
- [x] Go through all config vars and check that all of them are used
- [x] Make sure all the mount points in docker compose are the same as v1, so that you can just replace the image and everything would still work
- [x] Captcha

### Todo v2

- [x] avatars for all team endpoints
- [x] better file upload route
- [x] specific position in solves
- [x] in solves list for a chal return also team's scoreboard position (global + division)
- [ ] in global leaderboard return division positions
- [x] delete a solve (admin only)
- [x] resetting teams token (admin only)
- [ ] update client config (admin only)
- [ ] send prize emails (admin only)
- [x] file sizes

- [x] add csp headers

- [ ] instancer integration
- - [x] docker
- - [ ] k8s
- [ ] admin bot integration
- [x] blood bot integration

- [ ] discord auth

- [ ] ticket bot?

- [ ] analytics (google, cloudflare, something else?)

## New features compared to v1

- No more verify.recover token type, we just use team tokens from now on
- Scores config
- New captcha providers (`turnstile`, `hcaptcha`)
- New `s3` upload provider
- gcs tf now needs a `storage.objects.delete` permission
- added bloodbot
- avatars moderation
