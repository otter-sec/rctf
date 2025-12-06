# reCAPTCHA

To protect sensitive actions from abuse, configure Google reCAPTCHA v2 (invisible).
You can [register for credentials here](https://www.google.com/recaptcha/admin/create).

Copy the values from Google into `recaptcha.siteKey` and `recaptcha.secretKey` (or
`RCTF_RECAPTCHA_SITE_KEY` and `RCTF_RECAPTCHA_SECRET_KEY`).

You must also set `recaptcha.protectedActions` to a list of actions that require a
token. Valid values are:

- `register`
- `recover`
- `setEmail`

Example configuration to protect registration and auth recovery endpoints:

```yaml
recaptcha:
  siteKey: AAA
  secretKey: BBB
  protectedActions:
    - register
    - recover
```
