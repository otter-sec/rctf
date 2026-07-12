import { mkdir, rm } from 'fs/promises'
import { resolve } from 'path'
import { defineCommand } from 'citty'
import type { Backend } from './assembler.ts'
import { copyWebBuild, injectInterceptor } from './assembler.ts'
import { discoverAndFetch } from './discovery.ts'
import { createFetcher } from './fetcher.ts'
import { generateInterceptorScript } from './interceptor.ts'
import { downloadUploads } from './uploads.ts'
import { rewriteUrls } from './url-rewriter.ts'

const VALID_BACKENDS: Backend[] = ['cloudflare-pages', 'github-pages']

export default defineCommand({
  meta: {
    name: 'export',
    description: 'Export a static archive of a running instance',
  },
  args: {
    'api-url': {
      type: 'string',
      required: true,
      description: 'Base URL of the running rCTF API',
    },
    backend: {
      type: 'string',
      required: true,
      description: `Deploy target: ${VALID_BACKENDS.join(' or ')}`,
    },
    'web-build': {
      type: 'string',
      default: 'apps/web/build',
      description: 'Path to the web build directory',
    },
    output: {
      type: 'string',
      default: './export-output',
      description: 'Output directory',
    },
    concurrency: {
      type: 'string',
      default: '5',
      description: 'Concurrent API fetches',
    },
    'skip-uploads': {
      type: 'boolean',
      default: false,
      description: 'Skip downloading uploads',
    },
  },
  run: async ({ args }) => {
    const apiUrl = args['api-url']

    const backend = args.backend as Backend
    if (!VALID_BACKENDS.includes(backend)) {
      console.error(
        `Error: --backend is required and must be one of: ${VALID_BACKENDS.join(', ')}`
      )
      process.exit(1)
    }

    const webBuildDir = resolve(args['web-build'])
    const outputDir = resolve(args.output)
    const concurrency = parseInt(args.concurrency, 10)
    const skipUploads = args['skip-uploads']

    console.log('rctf static export')
    console.log(`  API URL:     ${apiUrl}`)
    console.log(`  Backend:     ${backend}`)
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
    await injectInterceptor(outputDir, interceptorScript, backend)

    console.log('')
    console.log(`Export complete! Output: ${outputDir}`)
    console.log('')
    console.log('To deploy:')

    if (backend === 'cloudflare-pages') {
      console.log(`  npx wrangler pages deploy ${outputDir}`)
    } else if (backend === 'github-pages') {
      console.log(`  npx gh-pages -d ${outputDir} --dotfiles`)
    }
  },
})
