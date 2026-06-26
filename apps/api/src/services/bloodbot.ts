import { config } from '@rctf/config'
import type { ChallengeData, User } from '@rctf/db'
import mustache from 'mustache'
import { bloodBotProviders } from '../providers'
import { buildBloodMessageView } from './bloodbot-view'

export const shouldNotifyBloodbot = (bloodNumber: number) => {
  return config.bloodBot && bloodNumber <= config.bloodBot.bloodsCount
}

export const sendBloodMessage = async (
  user: User,
  challenge: ChallengeData,
  bloodNumber: number
) => {
  if (!config.bloodBot) {
    return
  }

  await Promise.all(
    config.bloodBot.destinations.map((destination, index) => {
      const provider = bloodBotProviders![index]!

      const view = buildBloodMessageView({
        user,
        challenge,
        bloodNumber,
        bloodEmojis: destination.bloodEmojis,
        origin: config.origin,
        provider,
      })
      const message = mustache.render(
        destination.messageTemplate,
        view,
        {},
        { escape: (v: string) => v }
      )
      return provider.sendMarkdown(message)
    })
  )
}
