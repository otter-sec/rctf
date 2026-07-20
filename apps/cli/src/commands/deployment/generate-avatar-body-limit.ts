import { config } from '@rctf/config'
import { defineCommand } from 'citty'

const MULTIPART_OVERHEAD = 64 * 1024

export default defineCommand({
  meta: {
    name: 'generate-avatar-body-limit',
    description:
      'Generate the nginx client_max_body_size directive for avatar uploads',
  },
  run: () => {
    process.stdout.write(
      `client_max_body_size ${config.maxAvatarSize + MULTIPART_OVERHEAD};\n`
    )
  },
})
