---
title: Blood bot
description: Configure first blood announcements to Discord and Telegram.
order: 4
---

The blood bot posts an announcement to Discord or Telegram channels (or both) when teams land an early solve on a challenge.

## Configuration

```yaml title="rctf.d/bloodbot.yaml"
bloodBot:
  bloodsCount: 3
  destinations:
    - provider:
        name: messages/discord
        options:
          url: https://discord.com/api/webhooks/123456/abcdef
      bloodEmojis:
        - '<:rank1:1008801500736266261>'
        - '<:rank2:1008801501776449738>'
        - '<:rank3:1008801503080874056>'
    - provider:
        name: messages/telegram
        options:
          botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'
          chatId: '-1001234567890'
```

| Field                                | Type            | Default | Description                                                |
| ------------------------------------ | --------------- | ------- | ---------------------------------------------------------- |
| `<red>bloodsCount</red>`             | `number{:ts}`   | `1{:ts}` | Number of blood tiers to announce (1-3)                    |
| `<red>destinations</red>`            | `array{:ts}`    | -       | At least one destination required                          |
| `<red>destinations[].bloodEmojis</red>` | `string[]{:ts}` | `[]{:ts}` | Optional blood emoji for that destination |

`<red>bloodsCount</red>` set to `3{:ts}` announces first, second, and third blood. Set it to `1{:ts}` and only first blood gets announced.

## Message providers

::::tabs
:::tab[messages/discord]
Posts announcements through a Discord webhook.

| Option           | Description         |
| ---------------- | ------------------- |
| `<red>url</red>` | Discord webhook URL |

To create a webhook, navigate to Server Settings > Integrations > Webhooks > New Webhook, then copy the webhook URL.
:::
:::tab[messages/telegram]
Posts announcements through a Telegram bot.

| Option                | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `<red>botToken</red>` | Telegram bot token (from [@BotFather](https://t.me/BotFather)) |
| `<red>chatId</red>`   | Target chat or group ID                                        |
| `<red>threadId</red>` | Message thread ID for forum/topic channels (optional)          |

:::
::::

## Custom message templates

Each destination can have a custom `<red>messageTemplate</red>`:

```yaml
bloodBot:
  bloodsCount: 3
  destinations:
    - provider:
        name: messages/discord
        options:
          url: https://discord.com/api/webhooks/...
      bloodEmojis:
        - '<:rank1:1008801500736266261>'
        - '<:rank2:1008801501776449738>'
        - '<:rank3:1008801503080874056>'
      messageTemplate: '{{bloodEmoji}} {{bloodNumTitle}} solve for challenge "**{{challengeName}}**" goes to **{{teamName}}**!'
```

Define emojis on each destination, not globally. That lets Discord use custom Discord emoji markup while Telegram can use Unicode emoji or a different template.

### Template variables

| Variable                | Description                                | Example                                  |
| ----------------------- | ------------------------------------------ | ---------------------------------------- |
| `{{teamName}}`          | Team display name                          | `SuperHackers`                           |
| `{{teamUrl}}`           | URL to team profile                        | `https://ctf.example.com/profile/abc123` |
| `{{bloodEmoji}}`        | Emoji configured for this blood number     | `<:rank1:1008801500736266261>`           |
| `{{bloodNumber}}`       | Numeric blood position                     | `1`                                      |
| `{{bloodNumOrdinal}}`   | Ordinal blood position                     | `1st`                                    |
| `{{bloodNumSentence}}`  | Ordinal blood position, kept for templates | `1st`                                    |
| `{{bloodNumWord}}`      | Word blood position                        | `first`                                  |
| `{{bloodNumTitle}}`     | Title-cased word blood position            | `First`                                  |
| `{{challengeCategory}}` | Challenge category                         | `web`                                    |
| `{{challengeName}}`     | Challenge name                             | `SQL Injection 101`                      |

### Default templates

When no custom template is set, the defaults kick in.

The Discord default is ``{{#bloodEmoji}}{{bloodEmoji}} {{/bloodEmoji}}Congratulations to [`{{teamName}}`]({{teamUrl}}) for {{bloodNumSentence}} blood on `{{challengeCategory}}/{{challengeName}}`!``.

The Telegram default is ``{{#bloodEmoji}}{{bloodEmoji}} {{/bloodEmoji}}Congratulations to [*{{teamName}}*]({{teamUrl}}) for {{bloodNumSentence}} blood on `{{challengeCategory}}/{{challengeName}}`\!``.

The Telegram template uses MarkdownV2 syntax and escapes the `!` character, which the Telegram API requires.
