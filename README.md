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

# run the thing
bun run dev
```

rCTF v1 frontend with rCTF v2 backend:

- `bun run dev` in this repo
- `yarn workspace @rctf/client dev` in the old repo
- access [http://127.0.0.1:8080](http://127.0.0.1:8080)

## Roadmap

- [x] `/api/v1/auth/register`:
  - [x] User creation
  - [x] CTFTime login
  - [x] Divisions ACL
  - [x] Email verification:
    - [x] SMTP
    - [x] SES (untested) - TODO: bump aws sdk to v3
    - [x] Postmark (untested)
    - [x] Mailgun (untested)
- [ ] `/api/v1/auth/verify`:
  - [x] Register
  - [x] Recover
  - [ ] Update
- [x] `/api/v1/auth/login`
- [x] `/api/v1/auth/recover`
- [x] `/api/v1/auth/test`

- [x] `/api/v1/challs`
- [x] `/api/v1/challs/:id/submit`
- [x] `/api/v1/challs/:id/solves`

- [x] `/api/v1/admin/challs`
- [x] `/api/v1/admin/challs/:id` DELETE
- [x] `/api/v1/admin/challs/:id` GET
- [x] `/api/v1/admin/challs/:id` POST
- [ ] `/api/v1/admin/upload`
- [ ] `/api/v1/admin/upload/query`

- [x] `/api/v1/leaderboard/now`
- [x] `/api/v1/leaderboard/graph`

- [x] `/api/v1/integrations/client/config`
- [x] `/api/v1/integrations/ctftime/leaderboard`
- [x] `/api/v1/integrations/ctftime/callback`

- [x] `/api/v1/users/me`
- [ ] `/api/v1/users/me` PATCH
- [ ] `/api/v1/users/:id`
- [ ] `/api/v1/users/me/members`
- [ ] `/api/v1/users/me/members`
- [ ] `/api/v1/users/me/members/:id`
- [ ] `/api/v1/users/me/auth/email`
- [ ] `/api/v1/users/me/auth/email`
- [ ] `/api/v1/users/me/auth/ctftime`
- [ ] `/api/v1/users/me/auth/ctftime`
