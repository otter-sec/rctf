<img src="./apps/docs/public/favicon.svg" align="left" width="128" height="128" hspace="20" alt="rCTF" />

rCTF is a platform for hosting cybersecurity [capture-the-flag](<https://en.wikipedia.org/wiki/Capture_the_flag_(cybersecurity)>) competitions. Originally developed by [redpwn](https://redpwn.net/), it is now maintained by the [OtterSec](https://osec.io) team.

To get started with rCTF, visit the [documentation](https://rctf.osec.io). If you need help with rCTF, [start a discussion](https://github.com/otter-sec/rctf/discussions).

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
       port: 55432
       # host: postgres
       user: rctf
       password: DO_NOT_USE_ME
       database: rctf
     redis:
       host: 127.0.0.1
       port: 56379
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

For frontend work, run `bun dev:mock` to migrate, seed deterministic mock teams/challenges/solves, and start the dev server (login URLs are printed to stdout). Use `bun dev:seed` to reseed without restarting.
