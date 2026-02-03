<div align="center">

# ![rCTF](/apps/docs/docs/public/banner.svg)

rCTF is a platform for hosting cybersecurity [capture-the-flag](https://en.wikipedia.org/wiki/Capture_the_flag_(cybersecurity)) competitions. Originally developed by [redpwn](https://redpwn.net/), it is now maintained by the [OtterSec](https://osec.io) team.

To get started with rCTF, visit the [documentation](https://rctf.osec.io). If you need help with rCTF, [start a discussion](https://github.com/otter-sec/rctf/discussions).

</div>

## Development

rCTF requires [Bun v1.0+](https://bun.sh/).

<details>
<summary>Quick-start script:</summary>

```sh
docker compose -f compose.dev.yml up -d
bun i

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

bun run dev
```

</details>

1. Install dependencies:

   ```sh
   bun i
   ```

2. Start the development containers:

   ```sh
   docker compose -f compose.dev.yml up -d
   ```

3. Create `rctf.d/00-development.yaml` and enter the following:

   ```yml
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
   ```

4. Start the development server:
   
   ```sh
   bun dev
   ```

> [!NOTE]
> To run an rCTF v1 frontend with a v2 backend:
>
> 1. `bun run dev:api` in this repo
> 2. `yarn workspace @rctf/client dev` in the old repo
> 3. Open [http://127.0.0.1:8080](http://127.0.0.1:8080)

## Roadmap
| Endpoint | `/apps/api` | `/apps/web` |
| --- | :-: | :--: |
| `POST /api/v1/auth/register` | ✅ | ✅ |
| `POST /api/v1/auth/verify` | ✅ | ✅ |
| `POST /api/v1/auth/login` | ✅ | ✅ |
| `POST /api/v1/auth/recover` | ✅ | ✅ |
| `GET /api/v1/auth/test` | ✅ | — |
| `GET /api/v1/challs` | ✅ | ✅ |
| `POST /api/v1/challs/:id/submit` | ✅ | ✅ |
| `GET /api/v1/challs/:id/solves` | ✅ | ✅ |
| `GET /api/v1/admin/challs` | ✅ | ✅ |
| `GET /api/v1/admin/challs/:id` | ✅ | ✅ |
| `PUT /api/v1/admin/challs/:id` | ✅ | ✅ |
| `DELETE /api/v1/admin/challs/:id` | ✅ | ✅ |
| `POST /api/v1/admin/upload` | ✅ | ✅ |
| `POST /api/v1/admin/upload/query` | ✅ | — |
| `GET /api/v1/leaderboard/now` | ✅ | ✅ |
| `GET /api/v1/leaderboard/graph` | ✅ | ✅ |
| `GET /api/v1/integrations/client/config` | ✅ | ✅ |
| `GET /api/v1/integrations/ctftime/leaderboard` | ✅ | — |
| `POST /api/v1/integrations/ctftime/callback` | ✅ | ✅ |
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

## New features compared to v1

- No more `verify.recover` token type, we just use team tokens from now on
- Scores configuration
- New captcha providers (`turnstile`, `hcaptcha`)
- New `s3` upload provider
- GCS TF now needs a `storage.objects.delete` permission
- Bloodbot integration
- Avatar moderation
- More analytics providers (`cloudflare`, `plausible`)


### v1 Todo

- [x] Run migrations programatically depending on the config value instead of just running in dockerfile entry
- [x] Go through all config vars and check that all of them are used
- [x] Make sure all the mount points in docker compose are the same as v1, so that you can just replace the image and everything would still work
- [x] Captcha

### v2 Todo

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
- [x] analytics (google, cloudflare, something else?)
- [x] refactor bloodbot
- [ ] cf worker for docs, get rid of docker compose temp setup
- [ ] benchmark on a 1vcpu 1gb machine (kroot had some issues with building, probably because of ram)
- [ ] rctf2pages
- [x] run tests in ci 
