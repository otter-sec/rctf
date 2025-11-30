import type { Hono } from 'hono'
import type { AppEnv } from '../../lib/app-env'

export const encodeKey = (key: string): string => {
  const components = key.split('/')
  return components.map(encodeURIComponent).join('/')
}

export abstract class UploadProvider {
  abstract startupWebPart(app: Hono<AppEnv>): Promise<void>

  abstract uploadFile: (data: Buffer, key: string) => Promise<string>
  abstract deleteFile: (key: string) => Promise<void>
  abstract getFileUrl: (key: string) => Promise<string | null>

  private getAttachmentKey(hash: string, name: string): string {
    return `${hash}/${name}`
  }

  private getAvatarKey(
    teamId: string,
    contentHash: string,
    fileExtension: string
  ): string {
    return `avatars/${teamId}/${contentHash}.${fileExtension}`
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
    fileExtension: string,
    previousUrl: string | null
  ): Promise<string> {
    if (previousUrl) {
      const oldKey = this.extractKeyFromUrl(previousUrl)
      if (oldKey) {
        await this.deleteFile(oldKey).catch(() => {})
      }
    }

    const contentHash = new Bun.SHA256().update(data).digest('hex')
    return this.uploadFile(
      data,
      this.getAvatarKey(teamId, contentHash, fileExtension)
    )
  }

  async deleteAvatar(url: string): Promise<void> {
    const key = this.extractKeyFromUrl(url)
    if (key) {
      await this.deleteFile(key).catch(() => {})
    }
  }

  protected extractKeyFromUrl(url: string): string | null {
    const match = url.match(/\/uploads\/(.+)$/)
    return match ? decodeURIComponent(match[1]!) : null
  }
}
