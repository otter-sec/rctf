import { beforeAll, describe, expect, test } from 'bun:test'
import { Window } from 'happy-dom'

// markdown.ts's getPurify() calls DOMPurify(window); without a real DOM it
// silently returns input UNSANITIZED. Register happy-dom globals BEFORE the
// dynamic import so the sanitizer wires up against a live document.
let md!: typeof import('./markdown')
let win!: Window

beforeAll(async () => {
  win = new Window()
  Object.assign(globalThis, { window: win, document: win.document })
  md = await import('./markdown')
})

/** Parse rendered HTML into a live element so we can query the real DOM tree. */
const frag = (html: string) => {
  const el = win.document.createElement('div')
  el.innerHTML = html
  return el
}

describe('alert hydration placeholders', () => {
  test('NOTE block renders the data-alert placeholder shape', () => {
    const out = md.parseMarkdown('> [!NOTE]\n> hello world')
    const div = frag(out).querySelector('[data-alert]')
    expect(div).not.toBeNull()
    expect(div?.getAttribute('data-type')).toBe('note')
    expect(div?.getAttribute('data-content')).toBe('hello world')
  })

  test('CONNECTION block renders the data-alert placeholder shape', () => {
    const out = md.parseMarkdown('> [!CONNECTION]\n> nc host 1337')
    const div = frag(out).querySelector('[data-alert]')
    expect(div).not.toBeNull()
    expect(div?.getAttribute('data-type')).toBe('connection')
    expect(div?.getAttribute('data-content')).toBe('nc host 1337')
  })

  test('per-session nonce never leaks into rendered output', () => {
    // The nonce gates hydration internally and must be stripped before render.
    const out = md.parseMarkdown('> [!NOTE]\n> visible')
    expect(out).not.toContain('data-nonce')
  })
})

describe('forged hydration attributes are neutralized', () => {
  test('hand-written data-alert without the nonce is stripped', () => {
    const out = md.parseMarkdown(
      '<div data-alert data-type="note" data-content="pwned"></div>'
    )
    // Non-vacuity: a legit alert (above) DOES carry data-alert, so its absence
    // here proves the afterSanitizeAttributes nonce gate actually executed.
    expect(out).not.toContain('data-alert')
    expect(out).not.toContain('data-content')
    expect(frag(out).querySelector('[data-alert]')).toBeNull()
  })

  test('hand-written data-timer without the nonce is stripped', () => {
    const out = md.parseMarkdown('<span data-timer></span>')
    expect(out).not.toContain('data-timer')
    expect(frag(out).querySelector('[data-timer]')).toBeNull()
  })
})

describe('fenced code blocks survive verbatim', () => {
  test('raw HTML with a blank line round-trips byte-identical inside <code>', () => {
    const raw = '<div class="x">hi</div>\n\n<p>y</p>'
    const out = md.parseMarkdown('```html\n' + raw + '\n```')
    const code = frag(out).querySelector('code')
    expect(code).not.toBeNull()
    // marked appends a trailing newline to fenced content; the fence-aware
    // separateHtmlBlocks must not inject blank lines or escape the raw source.
    expect(code?.textContent).toBe(raw + '\n')
  })

  test('fenced data-alert stays inert text, not a live placeholder', () => {
    const out = md.parseMarkdown(
      '```html\n<div data-alert data-type="note"></div>\n```'
    )
    expect(frag(out).querySelector('[data-alert]')).toBeNull()
  })
})

describe('timer extensions', () => {
  test('standalone <timer /> on its own line produces the block placeholder', () => {
    const out = md.parseMarkdown('<timer />')
    const span = frag(out).querySelector('[data-timer]')
    expect(span).not.toBeNull()
    expect(span?.parentElement?.tagName).toBe('P')
  })

  test('inline <timer/> mid-paragraph produces the inline placeholder', () => {
    const out = md.parseMarkdown('before <timer/> after')
    const root = frag(out)
    const p = root.querySelector('p')
    expect(p?.querySelector('[data-timer]')).not.toBeNull()
    expect(p?.textContent).toBe('before  after')
  })
})

describe('dangerous markup is sanitized out', () => {
  test('<script> is removed entirely', () => {
    const out = md.parseMarkdown('<script>alert(1)</script>')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('alert(1)')
  })

  test('<img onerror> keeps the tag but drops the event handler', () => {
    const out = md.parseMarkdown('<img src=x onerror=alert(1)>')
    const img = frag(out).querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('onerror')).toBeNull()
    expect(out).not.toContain('onerror')
  })
})

describe('alert content attribute escaping', () => {
  test('quotes and angle brackets round-trip without breaking the attribute', () => {
    const content = 'a "b" <c> &d'
    const out = md.parseMarkdown(`> [!NOTE]\n> ${content}`)
    // Quotes must be entity-escaped in the serialized attribute so they cannot
    // terminate it early.
    expect(out).toContain('&quot;')
    const div = frag(out).querySelector('[data-alert]')
    expect(div?.getAttribute('data-content')).toBe(content)
  })

  test('an attribute-breakout payload cannot inject a live element', () => {
    const content = '"><img src=x onerror=alert(1)>'
    const out = md.parseMarkdown(`> [!NOTE]\n> ${content}`)
    const root = frag(out)
    // The payload stays trapped inside data-content; no real <img> is created.
    expect(root.querySelectorAll('img').length).toBe(0)
    expect(
      root.querySelector('[data-alert]')?.getAttribute('data-content')
    ).toBe(content)
  })
})

describe('isAlertType guard', () => {
  test('accepts known alert types and rejects unknown ones', () => {
    expect(md.isAlertType('note')).toBe(true)
    expect(md.isAlertType('connection')).toBe(true)
    expect(md.isAlertType('bogus')).toBe(false)
  })
})
