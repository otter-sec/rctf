import { mkdir, rm } from 'fs/promises'
import { resolve } from 'path'
import { copyWebBuild, injectInterceptor } from './assembler.ts'
import { discoverAndFetch } from './discovery.ts'
import { createFetcher } from './fetcher.ts'
import { generateInterceptorScript } from './interceptor.ts'
import { downloadUploads } from './uploads.ts'
import { rewriteUrls } from './url-rewriter.ts'

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (!arg.startsWith('--')) {
      continue
    }
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      args[key] = next
      i++
    } else {
      args[key] = 'true'
    }
  }
  return args
}

async function main() {
  const args = parseArgs(Bun.argv.slice(2))

  const apiUrl = args['api-url']
  if (!apiUrl) {
    console.error('Error: --api-url is required')
    console.error(
      'Usage: bun run export --api-url <url> [--web-build <dir>] [--output <dir>] [--concurrency <n>] [--skip-uploads]'
    )
    process.exit(1)
  }

  const webBuildDir = resolve(args['web-build'] ?? 'apps/web/build')
  const outputDir = resolve(args['output'] ?? './export-output')
  const concurrency = parseInt(args['concurrency'] ?? '5', 10)
  const skipUploads = args['skip-uploads'] === 'true'

  console.log('rctf static export')
  console.log(`  API URL:     ${apiUrl}`)
  console.log(`  Web build:   ${webBuildDir}`)
  console.log(`  Output:      ${outputDir}`)
  console.log(`  Concurrency: ${concurrency}`)
  console.log(`  Skip uploads: ${skipUploads}`)
  console.log('')

  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })

  console.log('Copying web build...')
  await copyWebBuild(webBuildDir, outputDir)

  console.log('Starting discovery...')
  const fetcher = createFetcher(apiUrl, concurrency, outputDir)
  const result = await discoverAndFetch({
    fetcher,
    outputDir,
    skipUploads,
  })

  if (!skipUploads && result.uploadUrls.length > 0) {
    console.log('[Uploads] Downloading uploads...')
    const urlMap = await downloadUploads({
      fetcher,
      outputDir,
      uploadUrls: result.uploadUrls,
      apiUrl,
    })

    console.log('[URL Rewrite] Rewriting URLs in API data...')
    await rewriteUrls(outputDir, urlMap)
  }

  console.log('Injecting fetch interceptor...')
  const interceptorScript = generateInterceptorScript()
  await injectInterceptor(outputDir, interceptorScript)

  console.log('')
  console.log(`Export complete! Output: ${outputDir}`)
}

main().catch(err => {
  console.error('Export failed:', err)
  process.exit(1)
})
