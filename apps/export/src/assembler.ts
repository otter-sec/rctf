import { cp } from 'fs/promises'
import { join } from 'path'

export async function copyWebBuild(
  webBuildDir: string,
  outputDir: string
): Promise<void> {
  await cp(webBuildDir, outputDir, { recursive: true })
}

export async function injectInterceptor(
  outputDir: string,
  interceptorScript: string
): Promise<void> {
  const indexPath = join(outputDir, 'index.html')
  let html = await Bun.file(indexPath).text()

  html = html.replace(
    /(<head[^>]*>)/,
    `$1<script>${interceptorScript}</script>`
  )
  html = html.replace(
    /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/is,
    ''
  )

  await Bun.write(indexPath, html)
  await Bun.write(join(outputDir, '404.html'), html)
  await Bun.write(join(outputDir, '_redirects'), '/* /index.html 200\n')
}
