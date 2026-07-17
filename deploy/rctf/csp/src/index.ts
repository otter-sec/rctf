import { config } from '@rctf/config'

const NGINX_SECURITY_HEADERS_TEMPLATE_PATH =
  '/etc/rctf/nginx/security-headers.conf.template'
const NGINX_SECURITY_HEADERS_PATH = '/etc/rctf/nginx/security-headers.conf'

const nginxSecurityHeadersTemplate = await Bun.file(
  NGINX_SECURITY_HEADERS_TEMPLATE_PATH
).text()

const nginxSecurityHeaders = nginxSecurityHeadersTemplate.replace(
  '${RCTF_R2_PUBLIC_BASE_URL}',
  config.uploadProvider.name === 'uploads/r2'
    ? (config.uploadProvider.options as { publicBaseUrl: string }).publicBaseUrl
    : ''
)
await Bun.write(NGINX_SECURITY_HEADERS_PATH, nginxSecurityHeaders)
