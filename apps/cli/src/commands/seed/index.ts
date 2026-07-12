import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'seed',
    description: 'Wipe the database and fill it with demo data',
  },
  args: {
    force: {
      type: 'boolean',
      default: false,
      description: 'Seed even when NODE_ENV=production',
    },
  },
  run: async ({ args }) => {
    if (Bun.env.NODE_ENV === 'production' && !args.force) {
      console.error('Refusing to seed: NODE_ENV=production.')
      console.error(
        'Seeding DELETES all users, challenges, solves, submissions, and settings.'
      )
      console.error(
        'Re-run with --force if you really want to wipe this instance.'
      )
      process.exit(1)
    }

    const { runSeed } = await import('./run')
    await runSeed()
  },
})
