type StagedPayload = unknown

type ChallengeState = {
  payload: StagedPayload | undefined
  pendingFailure: number | undefined
}

const state = new Map<string, ChallengeState>()

const getOrInit = (id: string): ChallengeState => {
  let s = state.get(id)
  if (!s) {
    s = { payload: undefined, pendingFailure: undefined }
    state.set(id, s)
  }
  return s
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const route = async (req: Request): Promise<Response> => {
  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)

  if (req.method === 'GET' && parts[0] === 'health') {
    return json({ ok: true })
  }

  if (req.method === 'GET' && parts[0] === 'scores' && parts[1]) {
    const s = getOrInit(parts[1])
    if (s.pendingFailure !== undefined) {
      const status = s.pendingFailure
      s.pendingFailure = undefined
      return new Response('staged failure', { status })
    }
    const fail = url.searchParams.get('fail')
    if (fail) {
      return new Response('forced failure', {
        status: Number.parseInt(fail, 10),
      })
    }
    if (s.payload === undefined) {
      return new Response('no staged payload', { status: 404 })
    }
    return json(s.payload)
  }

  if (req.method === 'PUT' && parts[0] === 'control' && parts[1]) {
    const s = getOrInit(parts[1])
    s.payload = await req.json().catch(() => undefined)
    return json({ ok: true, challengeId: parts[1] })
  }

  if (
    req.method === 'POST' &&
    parts[0] === 'control' &&
    parts[1] &&
    parts[2] === 'fail'
  ) {
    const s = getOrInit(parts[1])
    const status = Number.parseInt(url.searchParams.get('status') ?? '503', 10)
    s.pendingFailure = status
    return json({ ok: true, challengeId: parts[1], status })
  }

  if (req.method === 'DELETE' && parts[0] === 'control') {
    state.clear()
    return json({ ok: true })
  }

  return new Response('not found', { status: 404 })
}

const server = Bun.serve({
  port: 80,
  hostname: '0.0.0.0',
  fetch: route,
})

console.log(`mock-backend listening on ${server.hostname}:${server.port}`)
