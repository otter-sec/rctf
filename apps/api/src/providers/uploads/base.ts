import type { Hono } from 'hono'
import type { AppEnv } from '../../lib/app-env'

export const encodeKey = (key: string): string => {
  const components = key.split('/')
  return components.map(encodeURIComponent).join('/')
}

export abstract class UploadProvider {
  abstract startupWebPart(app: Hono<AppEnv>): Promise<void>

  abstract uploadFile: (data: Buffer, key: string) => Promise<string>
  abstract getFileUrl: (key: string) => Promise<string | null>

  private getAttachmentKey(hash: string, name: string): string {
    return `${hash}/${name}`
  }

  private getAvatarKey(teamId: string, fileExtension: string): string {
    return `avatars/${teamId}.${fileExtension}`
  }

  async uploadAttachment(data: Buffer, name: string): Promise<string> {
    const hash = new Bun.SHA256().update(data).digest('hex')
    return this.uploadFile(data, this.getAttachmentKey(hash, name))
  }

  async getAttachmentUrl(sha256: string, name: string): Promise<string | null> {
    return this.getFileUrl(this.getAttachmentKey(sha256, name))
  }

  async uploadAvatar(
    data: Buffer,
    teamId: string,
    fileExtension: string
  ): Promise<string> {
    return this.uploadFile(data, this.getAvatarKey(teamId, fileExtension))
  }
}
