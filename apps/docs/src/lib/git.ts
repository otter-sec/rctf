import { execFileSync } from "node:child_process"

const cache = new Map<string, Date | null>()

export function gitLastUpdated(path: string): Date | null {
  const cached = cache.get(path)
  if (cached !== undefined) return cached

  let date: Date | null = null
  try {
    const output = execFileSync(
      "git",
      ["log", "-1", "--format=%ct", "--", path],
      { encoding: "utf8" },
    ).trim()
    if (output) date = new Date(Number(output) * 1000)
  } catch {}

  cache.set(path, date)
  return date
}
