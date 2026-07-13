---
title: "`<route>PATCH</route>` Update avatar"
description: "`<route>PATCH /api/v2/users/me/avatar</route>`"
order: 4
---

:::aside

::::route-example{def="UpdateAvatarRoute" pick="captchaCode" extra="BadBody"}

```json body
{
  "captchaCode": "optional-captcha-code"
}
```

::::

:::

::route-meta{def="UpdateAvatarRoute" rateLimit="Avatar upload bucket. Burst `2` and refill window `120000` ms per user."}

This route uploads, replaces, or removes the team avatar. The request body uses `multipart/form-data`.

Include an image file as the `avatar` form field to upload or replace an avatar. Leaving out `avatar` removes the current avatar when one exists.

The route checks `maxAvatarSize`, resizes the image to 256 by 256 pixels, converts it to WebP, and can send it through the moderation provider. The active upload provider stores the new image. The previous avatar is deleted when it is replaced.

::request-body{def="UpdateAvatarRoute" title="Request body"}

::response-body{def="UpdateAvatarRoute" response="goodAvatarUpdated" title="Response fields"}
