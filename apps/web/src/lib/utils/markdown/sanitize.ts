import DOMPurify from 'dompurify'

export const nonce = crypto.randomUUID()

const HYDRATION_ATTRS = [
  'data-alert',
  'data-type',
  'data-content',
  'data-timer',
  'data-action-button',
  'data-href',
]

export const escapeAttribute = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

let purify: ReturnType<typeof DOMPurify> | undefined

export const getPurify = () => {
  if (purify) return purify
  purify = DOMPurify(window)
  purify.addHook('afterSanitizeAttributes', node => {
    const emittedByExtension = node.getAttribute('data-nonce') === nonce
    node.removeAttribute('data-nonce')
    if (emittedByExtension) return
    for (const name of HYDRATION_ATTRS) node.removeAttribute(name)
  })
  return purify
}
