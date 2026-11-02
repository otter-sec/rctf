const FENCED_CODE =
  /(^|\n)(?:```|~~~)[^\n]*\n[\s\S]*?\n(?:```|~~~)[ \t]*(?=\n|$)/g
const BLOCK_HTML_BOUNDARY =
  /(<\/(?:div|p|blockquote|pre|table|dl|ol|ul|fieldset|details|dialog|figure|figcaption|footer|form|header|hr|main|nav|search|section|h[1-6])>|<(?:hr|br|img|input|source|track|wbr)\b[^>]*\/?>)\n(?!\n)/gi

export const separateHtmlBlocks = (markdown: string): string => {
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
