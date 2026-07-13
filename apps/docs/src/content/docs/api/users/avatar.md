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

Send an image in the `avatar` field of a `multipart/form-data` body to set or replace the team avatar. Omit the field to remove the current avatar.

rCTF enforces `maxAvatarSize`, resizes the image to 256 by 256 pixels, converts it to WebP, and checks it with the moderation provider when configured. After the upload provider stores the new image, rCTF deletes the previous one.

::request-body{def="UpdateAvatarRoute" title="Request body"}

::response-body{def="UpdateAvatarRoute" response="goodAvatarUpdated" title="Response fields"}
