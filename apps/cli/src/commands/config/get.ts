import { config } from '@rctf/config'
import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'get',
    description: 'Print a resolved config value',
  },
  args: {
    path: {
      type: 'positional',
      description: 'Dot-separated config path',
      required: true,
    },
  },
  run: ({ args }) => {
    let value: unknown = config
    for (const key of args.path.split('.')) {
      if (value === null || typeof value !== 'object') {
        value = undefined
        break
      }
      value = (value as Record<string, unknown>)[key]
    }

    if (value === undefined) {
      console.error(`No config value at '${args.path}'`)
      process.exit(1)
    }

    const output = typeof value === 'string' ? value : JSON.stringify(value)
    process.stdout.write(`${output}\n`)
  },
})
