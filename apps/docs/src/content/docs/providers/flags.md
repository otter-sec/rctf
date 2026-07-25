---
title: Flag providers
description: Flag validation providers for exact-match and regex flags.
order: 7
---

Flag providers validate submissions against a challenge's flag entries. A challenge holds a list of entries, each naming a provider and a provider-specific `<red>config</red>`, and a submission solves the challenge when any entry accepts it.

Unlike the other providers in this section, flag providers are not selected in the server configuration. Every provider is always available, and each flag entry picks one:

```json
"flags": [
  {
    "provider": "flags/static",
    "config": { "flag": "rctf{example}" }
  },
  {
    "provider": "flags/regex",
    "config": { "pattern": "^rctf\\{example\\}$", "flags": "i" }
  }
]
```

## Providers

::::tabs
:::tab[flags/static]
Exact string match. The submission is compared against `<red>config.flag</red>` with a constant-time comparison. Entries that omit `<red>provider</red>` use this provider.

```json
{
  "provider": "flags/static",
  "config": { "flag": "rctf{example}" }
}
```

| Option              | Description             |
| ------------------- | ----------------------- |
| `<red>flag</red>`   | The exact flag string.  |

:::
:::tab[flags/regex]
Regular expression match. The submission is tested against the JavaScript regex in `<red>config.pattern</red>`. A pattern matches anywhere in the submission, so anchor it with `^...${:ts}` when the whole submission must match.

```json
{
  "provider": "flags/regex",
  "config": { "pattern": "^rctf\\{example\\}$", "flags": "i" }
}
```

| Option               | Description                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `<red>pattern</red>` | Regular expression source. Must compile as a JavaScript regex.                                       |
| `<red>flags</red>`   | Optional regex flags, such as `<green>i</green>` for case-insensitive matching. Any subset of `dgimsuvy{:ts}`. |

:::
::::
