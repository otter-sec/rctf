---
title: Markdown
description: Markdown extensions available in challenge descriptions, home page content, and sponsor descriptions.
order: 6
---

rCTF supports Markdown in challenge descriptions, homepage content, and sponsor descriptions. [`marked`](https://marked.js.org/) parses it, rCTF adds alerts and a countdown timer, and [DOMPurify](https://github.com/cure53/DOMPurify) sanitizes the resulting HTML.

The parser is in `apps/web/src/lib/utils/markdown.ts{:file}`, and `apps/web/src/lib/components/markdown.svelte{:file}` handles the interactive parts.

## Alerts

rCTF supports GitHub-style blockquote alerts. The opening line is a blockquote containing `[!TYPE]{:md}`, and any following blockquote lines form the alert body. The body is parsed as Markdown (except for `CONNECTION`, see below).

```text title="Challenge description"
> [!NOTE]
> The flag format is `rctf{...}`.

> [!WARNING]
> Brute-forcing the endpoint will result in a rate limit.
```

Six alert types are recognized. Anything else (e.g., `> [!INFO]{:md}`) falls back to a plain blockquote.

| Type | Trigger | Use for |
| --- | --- | --- |
| `note` | `> [!NOTE]{:md}` | General information. |
| `tip` | `> [!TIP]{:md}` | Optional advice or shortcuts. |
| `important` | `> [!IMPORTANT]{:md}` | Information players must read. |
| `warning` | `> [!WARNING]{:md}` | Behavior that can cause problems if ignored. |
| `caution` | `> [!CAUTION]{:md}` | Actions with potentially destructive consequences. |
| `connection` | `> [!CONNECTION]{:md}` | Remote connection info for hosted challenges (see below). |

The trigger keyword is case-insensitive. Indentation and additional blockquote lines follow standard Markdown blockquote rules.

:::warning[Visual reference only]
The docs site renders alerts with its own component, which looks different from rCTF's runtime alert styling. The behavior described here is what challenge authors actually see in the rCTF frontend.
:::

### Connection callout

Use `> [!CONNECTION]{:md}` for the connection string or URL in a challenge's **Remote** field.

```text title="Challenge description"
> [!CONNECTION]
> `nc challs.example.com 1337`

> [!CONNECTION]
> https://web-chall.example.com
```

Unlike the other alerts, the connection body is **not** parsed as Markdown. Wrapping backticks are stripped, and the content is rendered as either:

- A clickable link, if it starts with `http://` or `https://`.
- A monospaced code block, otherwise.

A copy button sits next to the value so players can paste it straight into a terminal.

## Timer

The `<timer />{:html}` element renders a live countdown for the competition. It must stand alone on its own line.

```md title="Home content"
The CTF is live. Good luck!

<timer />
```

The element takes **no attributes**. It always targets the global CTF schedule (`startTime` / `endTime` from the runtime client config). Behavior:

- Before the CTF starts, counts down to the start time with the label **CTF starts in**.
- After the start time, counts down to the end time with the label **CTF ends in**.
- After the end time, shows "The CTF is over."
- If the event is archived, shows "The CTF is archived."

The timer updates once per second on the client.

:::note[No per-element target]
rCTF doesn't support `<timer to="...">{:html}` or `<timer until="...">{:html}`. The countdown target is always the global competition schedule. If you need per-challenge deadlines, spell them out in plain text inside the description.
:::

## Standard Markdown

The renderer supports CommonMark headings, lists, emphasis, links, images, code, and blockquotes, along with `marked` tables and autolinks. Task lists, footnotes, and strikethrough are not supported.

````md title="Challenge description"
## Setup

Download the [source archive](./source.tar.gz) and run:

```bash
docker compose up
```

The service listens on port `8080`.
````

For the full list of what CommonMark supports, see the [CommonMark spec](https://spec.commonmark.org/).

## Sanitization

DOMPurify sanitizes the parsed HTML before it reaches the page. This has the following effects.

- `<script>{:html}` tags, inline event handlers (`onclick=`, `onerror=`, etc.), and dangerous protocols are stripped. Inline JavaScript will never execute.
- Most HTML tags from DOMPurify's default profile are allowed (e.g., `<details>{:html}`, `<summary>{:html}`, `<sub>{:html}`, `<sup>{:html}`, `<kbd>{:html}`).
- The alert and timer extensions use `data-alert`, `data-type`, `data-content`, and `data-timer` to mark elements that need client-side behavior. Each element they create also receives a temporary, secret `data-nonce`. A DOMPurify hook keeps the hydration attributes only when that nonce matches, then removes the nonce before returning the HTML. Markers written by hand have no effect because they do not carry the nonce and are stripped during sanitization.

If you need richer interactivity than these extensions cover, add it in the frontend code, not through embedded HTML in a description.
