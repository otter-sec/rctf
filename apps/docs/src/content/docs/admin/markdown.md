---
title: Markdown
description: Markdown extensions available in challenge descriptions, home page content, and sponsor descriptions.
order: 6
---

rCTF renders Markdown in challenge descriptions, the home page content, and sponsor descriptions. [`marked`](https://marked.js.org/) does the rendering with two custom extensions (alerts and timer), and the output then runs through [DOMPurify](https://github.com/cure53/DOMPurify) for sanitization before it hits the page.

The renderer is defined in `apps/web-new/src/lib/utils/markdown.ts{:file}` and hydrated by `apps/web-new/src/lib/components/markdown.svelte{:file}`.

## Alerts

rCTF supports GitHub-style blockquote alerts. The opening line is a blockquote containing `[!TYPE]{:md}`, and any following blockquote lines form the alert body. The body is parsed as Markdown (except for `CONNECTION`, see below).

```text title="Challenge description"
> [!NOTE]
> The flag format is `rctf{...}`.

> [!WARNING]
> Brute-forcing the endpoint will result in a rate limit.
```

Six alert types are recognized. Anything else (e.g. `> [!INFO]{:md}`) falls back to a plain blockquote.

| Type | Trigger | Use for |
| --- | --- | --- |
| `note` | `> [!NOTE]{:md}` | General information. |
| `tip` | `> [!TIP]{:md}` | Optional advice or shortcuts. |
| `important` | `> [!IMPORTANT]{:md}` | Information players must read. |
| `warning` | `> [!WARNING]{:md}` | Behaviour that can cause problems if ignored. |
| `caution` | `> [!CAUTION]{:md}` | Actions with potentially destructive consequences. |
| `connection` | `> [!CONNECTION]{:md}` | Remote connection info for hosted challenges (see below). |

The trigger keyword is case-insensitive. Indentation and additional blockquote lines follow standard Markdown blockquote rules.

:::warning[Visual reference only]
The docs site renders alerts with its own component, which looks different from rCTF's runtime alert styling. The behaviour described here is what challenge authors actually see in the rCTF frontend.
:::

### Connection callout

`> [!CONNECTION]{:md}` is a real, distinct alert type and not just a styled `NOTE`. It's built for the **Remote** field of a challenge, which holds a single line containing a connection string or URL.

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

The `<timer />{:html}` element renders a live countdown for the competition. It works both inline inside a paragraph and as a standalone block on its own line.

```md title="Home content"
The CTF begins in <timer />. Good luck!

<timer />
```

The element takes **no attributes**. It always targets the global CTF schedule (`startTime` / `endTime` from the runtime client config). Behaviour:

- Before the CTF starts, counts down to the start time and is labelled "CTF starts in".
- After the start time, counts down to the end time and is labelled "CTF ends in".
- After the end time, shows "The CTF is over."
- If the event is archived, shows "The CTF is archived."

The timer updates once per second on the client.

:::note[No per-element target]
rCTF doesn't support `<timer to="...">{:html}` or `<timer until="...">{:html}`. The countdown target is always the global competition schedule. If you need per-challenge deadlines, spell them out in plain text inside the description.
:::

## Standard Markdown

The renderer uses `marked` with its default options, so no GFM plugin is registered. CommonMark features (headings, lists, emphasis, links, images, fenced code blocks, inline code, blockquotes) plus `marked`'s built-in tables and autolinks all pass through. There are no task lists, footnotes, or strikethrough.

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

After parsing, the HTML passes through DOMPurify before it is inserted into the page. Author-facing implications:

- `<script>{:html}` tags, inline event handlers (`onclick=`, `onerror=`, etc.), and dangerous protocols are stripped. Inline JavaScript will never execute.
- Most HTML tags from DOMPurify's default profile are allowed (e.g. `<details>{:html}`, `<summary>{:html}`, `<sub>{:html}`, `<sup>{:html}`, `<kbd>{:html}`).
- The alert and timer extensions hydrate through the data attributes `data-alert`, `data-type`, `data-content`, and `data-timer`. These are gated by a per-render nonce: the extensions stamp every element they emit with a secret `data-nonce`, and a DOMPurify hook strips the hydration attributes from any element whose nonce doesn't match (then removes the nonce itself). Writing `data-alert`, `data-timer`, or the other markers by hand has no effect — hand-written markup never carries the nonce, so the hook removes the attributes and the content renders as inert HTML.

If you need richer interactivity than these extensions cover, add it in the frontend code, not through embedded HTML in a description.
