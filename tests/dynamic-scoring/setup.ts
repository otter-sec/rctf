import { docker, PROJECT, RCTF_BASE_URL } from './lib/harness'

const restartContainers = async (): Promise<void> => {
  console.log('Getting containers...')
  const containers = await docker.listContainers({ all: true })
  const projectContainers = containers.filter(
    c => c.Labels?.['com.docker.compose.project'] === PROJECT
  )

  if (projectContainers.length === 0) {
    throw new Error(
      `No containers found for project ${PROJECT}. Did you run "docker compose up --build -d"?`
    )
  }

  console.log(`Stopping ${projectContainers.length} containers...`)
  await Promise.all(
    projectContainers.map(async c => {
      const container = docker.getContainer(c.Id)
      try {
        await container.stop()
      } catch {
        // already stopped
      }
    })
  )

  console.log('Starting containers...')
  await Promise.all(
    projectContainers.map(async c => docker.getContainer(c.Id).start())
  )

  console.log('Waiting for services to be healthy...')
  await Bun.sleep(5000)

  for (let i = 0; i < 60; i++) {
    const ready = await fetch(
      `${RCTF_BASE_URL}/api/v1/integrations/client/config`
    )
      .then(r => r.ok)
      .catch(() => false)
    if (ready) {
      console.log('All services are ready')
      return
    }
    await Bun.sleep(1000)
  }

  throw new Error('Services failed to become healthy')
}

await restartContainers()
