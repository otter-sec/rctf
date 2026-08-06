import { Writable } from 'node:stream'

export const collectStream = () => {
  let output = ''
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString()
      callback()
    },
  })
  const read = async (): Promise<string> => {
    await new Promise<void>(resolve => destination.end(resolve))
    return output
  }
  return { destination, read }
}
