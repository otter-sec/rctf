<div align="center">

# ![rCTF](/apps/docs/docs/public/banner.svg)

rCTF is a platform for hosting cybersecurity [capture-the-flag](https://en.wikipedia.org/wiki/Capture_the_flag_(cybersecurity)) competitions. Originally developed by [redpwn](https://redpwn.net/), it is now maintained by the [OtterSec](https://osec.io) team.

To get started with rCTF, visit the [documentation](https://rctf.osec.io). If you need help with rCTF, [start a discussion](https://github.com/otter-sec/rctf/discussions).

</div>

## Development

rCTF requires [Bun v1.0+](https://bun.sh/).

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
    homeContent: "A description of your CTF. Markdown supported.\n\n<timer></timer>"

    origin: http://127.0.0.1:5173
    divisions:
      open: Open
    tokenKey: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
    startTime: 0
    endTime: 99999999999999

    database:
      sql:
        host: 127.0.0.1
        # host: postgres
        user: rctf
        password: DO_NOT_USE_ME
        database: rctf
      redis:
        host: 127.0.0.1
        # host: redis
        password: DO_NOT_USE_ME
      migrate: before

    # email:
    #   from: es3n1n@es3n1n.eu
    #   provider:
    #     name: 'emails/smtp'
    #     options:
    #       smtpUrl: 'smtp://es3n1n%es3n1n.eu:password@server.com:587'

    # ctftime:
    #   clientId: 2288
    #   clientSecret: secret

    # instancerProvider:
    #   name: 'instancer/docker-instancer'
    #   options:
    #     authToken: 'changeme!'
    #     apiUrl: 'http://tiny-instancer:1337'

    # captcha:
    #   provider:
    #     name: 'captcha/hcaptcha'
    #     options:
    #       siteKey: 'key'
    #       secretKey: 'secret'
    #   protectedEndpoints:
    #     - register
    #     - recover
    #     - setEmail
    #     - instancerStart
    #     - instancerExtend
    #     - avatarUpload
    #     - adminBotSubmit

    # bloodBot:
    #   bloodsCount: 1
    #   destinations:
    #     - provider:
    #         name: 'messages/discord'
    #         options:
    #           url: 'webhook-url'
    #     - provider:
    #         name: 'messages/telegram'
    #         options:
    #           botToken: 'bot-token'
    #           chatId: 1337

    # adminBot:
    #   provider:
    #     name: 'admin-bot/rctf-js'
    #     options:
    #       secretKey: beans
    #       endpoint: 'http://admin-bot:21337'

    # avatarsModeration:
    #   provider:
    #     name: 'moderation/openai'
    #     options:
    #         apiKey: 'key'

    # globalSiteTag: 'G-1337'

    # uploadProvider:
    #   name: 'uploads/gcs'
    #   options:
    #     projectId: project-id
    #     bucketName: bucket-name
    #     credentials:
    #       private_key: |-
    #         key
    #       client_email: me@me.iam.gserviceaccount.com
   ```

4. Start the development server:
   
   ```sh
   bun dev
   ```

## New features compared to v1

- No more `verify.recover` token type, we just use team tokens from now on
- Scores configuration
- New captcha providers (`turnstile`, `hcaptcha`)
- New `s3` upload provider
- GCS TF now needs a `storage.objects.delete` permission
- Bloodbot integration
- Adminbot integration
- Instancer integration
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
- [x] in global leaderboard return division positions
- [x] delete a solve (admin only)
- [x] resetting teams token (admin only)
- [x] update client config (admin only)
- [x] file sizes
- [x] add csp headers
- [x] instancer integration
- - [x] docker
- - [x] k8s
- [x] admin bot integration
- [x] blood bot integration
- [x] analytics (google, cloudflare, something else?)
- [x] refactor bloodbot
- [ ] cf worker for docs, get rid of docker compose temp setup
- [ ] benchmark on a 1vcpu 1gb machine (kroot had some issues with building, probably because of ram)
- [ ] rctf2pages
- [x] run tests in ci
- [ ] flag signing

### Features we will **NEVER** implement

- First blood bonus points
- Leaderboard freeze
- Limited number of flag submission attempts
- Requiring to be authorized to see challenges or leaderboard
