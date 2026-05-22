<div align="center">

#  <picture><source media="(prefers-color-scheme: dark)" srcset="apps/docs/src/assets/banner-dark.svg" /><img alt="Anchor" src="apps/docs/src/assets/banner-light.svg" /></picture>

[![Docs][Docs Badge]][Docs]
[![CI][CI Badge]][CI]
[![Release][Release Badge]][Releases]
[![Container][Container Badge]][Container]

</div>

rCTF is a platform for hosting cybersecurity [capture-the-flag](<https://en.wikipedia.org/wiki/Capture_the_flag_(cybersecurity)>) competitions.

rCTF is designed for indestructible performance and uniform composition. The platform is intentionally minimal at its core, ships as a single bundled deployment, and exposes every major integration as a swappable provider behind one configuration contract. Organizers start with what their event needs and add what they want through configuration, rather than modification.

To get started with rCTF, visit the [documentation](https://rctf.osec.io). If you need help with rCTF, [start a discussion](https://github.com/otter-sec/rctf/discussions).

---

| <picture><source media="(prefers-color-scheme: dark)" srcset="apps/docs/public/static/preview-01-dark.png" /><img alt="Preview 1" src="apps/docs/public/static/preview-01-light.png" /></picture> | <picture><source media="(prefers-color-scheme: dark)" srcset="apps/docs/public/static/preview-02-dark.png" /><img alt="Preview 2" src="apps/docs/public/static/preview-02-light.png" /></picture> |
| --- | --- |
| <picture><source media="(prefers-color-scheme: dark)" srcset="apps/docs/public/static/preview-03-dark.png" /><img alt="Preview 3" src="apps/docs/public/static/preview-03-light.png" /></picture> | <picture><source media="(prefers-color-scheme: dark)" srcset="apps/docs/public/static/preview-04-dark.png" /><img alt="Preview 4" src="apps/docs/public/static/preview-04-light.png" /></picture> |

---

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

3. Create `rctf.d/00-development.yaml` and enter the following configuration:
    
    <details>
    
    <summary>Open me!</summary>
    
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
    
    </details>

4. Start the development server:

   ```sh
   bun dev
   ```

For frontend work, run `bun dev:mock` to migrate, seed deterministic mock teams/challenges/solves, and start the dev server. Use `bun dev:seed` to reseed without restarting.

[Docs]: https://rctf.osec.io
[Docs Badge]: https://img.shields.io/badge/docs-rctf.osec.io-ca3c41?style=flat-square

[CI]: https://github.com/otter-sec/rctf/actions/workflows/ci.yml
[CI Badge]: https://img.shields.io/github/actions/workflow/status/otter-sec/rctf/ci.yml?branch=main&label=ci&logo=github&color=404040&style=flat-square

[Releases]: https://github.com/otter-sec/rctf/releases
[Release Badge]: https://img.shields.io/github/v/release/otter-sec/rctf?label=release&logo=github&color=a1a1a1&style=flat-square

[Container]: https://github.com/otter-sec/rctf/pkgs/container/rctf
[Container Badge]: https://img.shields.io/badge/ghcr.io-otter--sec%2Frctf-e5e5e5?logo=docker&logoColor=white&style=flat-square
