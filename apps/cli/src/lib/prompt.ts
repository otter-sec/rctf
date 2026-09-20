const ETX = ''
const BACKSPACE = ''
const SIGINT_EXIT_CODE = 130

// Reads a line without echoing it. Falls back to a plain read when stdin is
// not a TTY, so `rctf user set-password foo < secret` still works.
export const promptHidden = async (label: string): Promise<string> => {
  process.stdout.write(label)

  const stdin = process.stdin
  if (!stdin.isTTY) {
    for await (const line of console) return line
    return ''
  }

  stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')

  return await new Promise<string>(resolve => {
    let value = ''

    const restore = () => {
      stdin.removeListener('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
      process.stdout.write('\n')
    }

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          restore()
          resolve(value)
          return
        }
        if (char === ETX) {
          restore()
          process.exit(SIGINT_EXIT_CODE)
        }
        if (char === BACKSPACE || char === '\b') {
          value = value.slice(0, -1)
          continue
        }
        value += char
      }
    }

    stdin.on('data', onData)
  })
}
