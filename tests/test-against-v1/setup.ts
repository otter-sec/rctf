import { docker, instances, PROJECT } from './lib/harness'

async function restartContainers() {
  console.log('Getting containers...')
  const containers = await docker.listContainers({ all: true })
  const projectContainers = containers.filter(
    c => c.Labels?.['com.docker.compose.project'] === PROJECT
  )

  console.log(`Stopping ${projectContainers.length} containers...`)
  await Promise.all(
    projectContainers.map(async c => {
      const container = await docker.getContainer(c.Id)
      try {
        await container.stop()
      } catch (e) {
        // do nothing
      }
    })
  )

  console.log('Starting containers...')
  await Promise.all(
    projectContainers.map(async c => docker.getContainer(c.Id).start())
  )

  console.log('Waiting for services to be healthy...')
  await Bun.sleep(5000)

  for (let i = 0; i < 30; i++) {
    const checks = await Promise.all(
      instances.map(inst =>
        fetch(`${inst.url}/api/v1/integrations/client/config`)
          .then(r => r.ok)
          .catch(() => false)
      )
    )
    if (checks.every(Boolean)) {
      console.log('All services are ready!')
      return
    }
    await Bun.sleep(1000)
  }

  throw new Error('Services failed to become healthy')
}

await restartContainers()
