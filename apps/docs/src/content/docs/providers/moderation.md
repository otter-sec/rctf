---
title: Moderation providers
description: Configure avatar content moderation with OpenAI's moderation API.
order: 5
---

Moderation providers can reject inappropriate team avatars. Without one, rCTF accepts any image that passes the normal file and image checks.

## Configuration

```yaml
avatarsModeration:
  provider:
    name: moderation/openai
    options:
      apiKey: sk-...
  allowOnInternalError: true
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>avatarsModeration.provider</red>` | `object{:ts}` | - | Moderation provider configuration |
| `<red>avatarsModeration.allowOnInternalError</red>` | `boolean{:ts}` | `true{:ts}` | Whether to allow avatar uploads when the moderation API fails |

:::tip
With the default `<red>allowOnInternalError: true{:ts}</red>`, avatar uploads continue when the moderation service is unavailable. Set it to `false{:ts}` to reject uploads whenever moderation cannot complete.
:::

## Providers

### moderation/openai

Uses [OpenAI's moderation API](https://platform.openai.com/docs/guides/moderation/) to check avatar images for policy violations.

```yaml
avatarsModeration:
  provider:
    name: moderation/openai
    options:
      apiKey: sk-...
      model: omni-moderation-latest # Optional
```

| Option | Environment Variable | Default | Description |
| --- | --- | --- | --- |
| `<red>apiKey</red>` | `<yellow>RCTF_MODERATION_OPENAI_API_KEY</yellow>` or `<yellow>OPENAI_API_KEY</yellow>` | - | OpenAI API key |
| `<red>model</red>` | `<yellow>RCTF_MODERATION_OPENAI_MODEL</yellow>` | `omni-moderation-latest` | OpenAI moderation model |

The provider sends a 256-by-256 WebP copy of the avatar to OpenAI. rCTF rejects the upload when the moderation response flags the image.

## Moderation pipeline

When a user uploads an avatar, the pipeline runs in this order:

1. Check the image against `<red>maxAvatarSize</red>` (default 1 MB).
2. Resize to 256x256 pixels and convert to WebP.
3. If a moderation provider is configured, run the image through it.
4. If approved (or no provider configured), hand the image to the upload provider.
5. Delete the previous avatar, if any.
