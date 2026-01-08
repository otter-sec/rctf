import { config } from '@rctf/config'
import { getTimeOrdinal } from '@rctf/util'
import type { ChallengeData, User } from '@rctf/db'
import mustache from 'mustache'
import { bloodbotProviders } from '../providers'

export const shouldNotifyBloodbot = (bloodNumber: number) => {
  return config.bloodbot && bloodNumber <= config.bloodbot.bloodsCount
}

export const sendBloodMessage = async (
  user: User,
  challenge: ChallengeData,
  bloodNumber: number
) => {
  if (!config.bloodbot) {
    return
  }

  const teamUrl = `${config.origin}/profile/${user.id}`
  const bloodNumSentence = getTimeOrdinal(bloodNumber)

  await Promise.all(
    config.bloodbot.destinations.map((destination, index) => {
      const provider = bloodbotProviders![index]!

      const view = {
        bloodNumSentence,
        challengeCategory: challenge.category,
        challengeName: challenge.name,
        teamUrl: provider.escapeUrl(teamUrl),
        teamName: provider.escapeText(user.name),
      }
      const message = mustache.render(destination.messageTemplate, view)
      return provider.sendMarkdown(message)
    })
  )
}
