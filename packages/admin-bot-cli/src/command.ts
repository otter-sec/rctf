import { spawn } from 'node:child_process'

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export const runCommand = async (
  command: string,
  args: string[],
  options: {
    captureStdout?: boolean
    cwd?: string
    inherit?: boolean
    timeoutMilliseconds?: number
  } = {}
): Promise<CommandResult> => {
  return await new Promise((resolveResult, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: options.inherit
        ? 'inherit'
        : ['ignore', options.captureStdout ? 'pipe' : 'ignore', 'pipe'],
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    if (!options.inherit) {
      child.stdout?.setEncoding('utf8')
      child.stdout?.on('data', chunk => {
        stdout += chunk
      })
      child.stderr?.setEncoding('utf8')
      child.stderr?.on('data', chunk => {
        stderr += chunk
      })
    }

    const timeout = options.timeoutMilliseconds
      ? setTimeout(() => child.kill('SIGKILL'), options.timeoutMilliseconds)
      : undefined

    child.once('error', error => {
      if (timeout) clearTimeout(timeout)
      reject(error)
    })
    child.once('close', code => {
      if (timeout) clearTimeout(timeout)
      resolveResult({
        exitCode: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      })
    })
  })
}
