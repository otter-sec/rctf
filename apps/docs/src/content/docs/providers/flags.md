---
title: Flag providers
description: Flag validation providers for static, regex, and per-team flags.
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
  },
  {
    "provider": "flags/dynamic",
    "config": { "base": "rctf{example}", "mode": "auto" }
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

| Option            | Description            |
| ----------------- | ---------------------- |
| `<red>flag</red>` | The exact flag string. |

:::
:::tab[flags/regex]
Regular expression match. The submission is tested against the JavaScript regex in `<red>config.pattern</red>`. A pattern matches anywhere in the submission, so anchor it with `^...${:ts}` when the whole submission must match.

```json
{
  "provider": "flags/regex",
  "config": {
    "pattern": "^rctf\\{example\\}$",
    "flags": "i",
    "flagValue": "rctf{example}"
  }
}
```

| Option                | Description                                                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<red>pattern</red>`  | Regular expression source. Must compile as a JavaScript regex.                                                                                                                                              |
| `<red>flags</red>`    | Optional regex flags, such as `<green>i</green>` for case-insensitive matching. Any subset of `dgimsuvy{:ts}`.                                                                                               |
| `<red>flagValue</red>` | Optional concrete flag handed to per-team consumers such as the [admin bot](/integrations/admin-bot), which need an actual flag value that cannot be derived from the pattern alone. Must match the pattern. |

:::
:::tab[flags/dynamic]
Creates a random per-team flag for each challenge and stores it in the database. Another team's valid flag is accepted, but the solve is recorded as cheated.

```json
{
  "provider": "flags/dynamic",
  "config": {
    "base": "rctf{this_base_has_enough_lowercase_letters_for_leet_encoding}",
    "mode": "auto"
  }
}
```

| Option             | Description                                                                                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<red>base</red>` | Flag in `<red>prefix{content}</red>` format. In leet mode, every encodable lowercase character is independently randomized to itself, a digit lookalike, or its uppercase form — one random bit per character. |
| `<red>mode</red>` | `<green>auto</green>` (default) uses leet when the base has at least 20 encodable characters and a tail otherwise. `<green>leet</green>` requires at least 20 encodable characters. `<green>tail</green>` always appends 10 random lowercase hexadecimal characters after `_`. |
| `<red>exhaustion</red>` | What happens once every leet variant of the base is taken. `<green>tail</green>` (default) falls back to a tail flag so late teams still receive one. `<green>duplicate</green>` keeps the leet shape and assigns an already-taken flag; cheating is then attributed to the earliest team the flag was minted for. |

With the base above, leet mode creates flags like these:

```
rctf{7hi5_B4se_h4s_3nough_l0w3rcase_13tt3r5_f0r_leet_eNC0diN6}
rctf{th15_bas3_Ha5_eN0Ugh_loWeRc453_l3tteRs_f0R_le37_3ncod1N6}
rctf{7his_bas3_h45_3Nough_lowerca5e_l3t73R5_f0R_l33t_eNCoD1ng}
```

A base with fewer than 20 encodable characters, such as `rctf{short_flag}`, gets a tail in auto mode instead:

```
rctf{short_flag_4c47b19907}
rctf{short_flag_26e845e938}
```

A team's flag is created on first delivery and stays stable afterwards. Flags are bound to the challenge and base: changing the base invalidates previously created flags, and deleting a team deletes its flags.

Dynamic flags are delivered to instancers and admin bots through the same flags JSON as other concrete flag values.

:::warning[Dynamic flags need a delivery channel]
A created dynamic flag exists only in the database. Challenge descriptions and files are identical for every team, so they cannot carry a per-team value. Only two integrations ever receive a specific team's flag: an [instancer](/integrations/instancer), which materializes it inside that team's instance, and the [admin bot](/integrations/admin-bot), which hands it to the bot as the value the team is meant to steal. A challenge that uses neither leaves the flag stranded in the database. Participants never see it, and the challenge cannot be solved.
:::

:::
::::
