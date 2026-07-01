import { instances } from './lib/harness'

async function waitForServices() {
  console.log('Waiting for services to be healthy...')

  for (let i = 0; i < 60; i++) {
    const checks = await Promise.all(
      instances.map(async inst => {
        const ok = await fetch(`${inst.url}/api/v1/integrations/client/config`)
          .then(r => r.ok)
          .catch(() => false)
        return { name: inst.name, ok }
      })
    )

    if (checks.every(check => check.ok)) {
      console.log('All services are ready!')
      return
    }

    const pending = checks
      .filter(check => !check.ok)
      .map(check => check.name)
      .join(', ')
    console.log(`Still waiting on: ${pending}`)
    await Bun.sleep(1000)
  }

  throw new Error('Services failed to become healthy')
}

await waitForServices()
