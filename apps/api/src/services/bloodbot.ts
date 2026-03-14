import { config } from '@rctf/config'
import type { ChallengeData, User } from '@rctf/db'
import { getTimeOrdinal } from '@rctf/util'
import mustache from 'mustache'
import { bloodBotProviders } from '../providers'

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

  const teamUrl = `${config.origin}/profile/${user.id}`
  const bloodNumSentence = getTimeOrdinal(bloodNumber)

  await Promise.all(
    config.bloodBot.destinations.map((destination, index) => {
      const provider = bloodBotProviders![index]!

      const view = {
        bloodNumSentence,
        challengeCategory: challenge.category,
        challengeName: challenge.name,
        teamUrl: provider.escapeUrl(teamUrl),
        teamName: provider.escapeText(user.name),
      }
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
