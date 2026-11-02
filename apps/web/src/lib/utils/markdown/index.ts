import { Marked } from 'marked'
import { actionButton } from '$lib/utils/markdown/action-button'
import { alert } from '$lib/utils/markdown/alert'
import { separateHtmlBlocks } from '$lib/utils/markdown/html-blocks'
import { getPurify } from '$lib/utils/markdown/sanitize'
import { timer } from '$lib/utils/markdown/timer'

export {
  ALERT_TYPES,
  isAlertType,
  type AlertType,
} from '$lib/utils/markdown/alert'

const marked = new Marked({
  extensions: [alert, timer, actionButton],
  hooks: {
    preprocess: separateHtmlBlocks,
    postprocess: html => getPurify().sanitize(html),
  },
})

export const parseMarkdown = (content: string): string =>
  marked.parse(content, { async: false })

export const parseAlertContent = parseMarkdown
