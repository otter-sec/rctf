import { config } from '@rctf/config'
import type { ChallengeData, User } from '@rctf/db'
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

  // FIXME(es3n1n): there's an util for this somewhere
  const bloodNumSentence =
    {
      1: 'first',
      2: 'second',
      3: 'third',
    }[bloodNumber] ?? `${bloodNumber}th`

  await Promise.all(
    config.bloodbot.destinations.map((destination, index) => {
      const provider = bloodbotProviders![index]!

      // TODO(es3n1n): use a template engine
      const message = destination.messageTemplate
        .replaceAll('{bloodNumSentence}', bloodNumSentence)
        .replaceAll('{challengeCategory}', challenge.category)
        .replaceAll('{challengeName}', challenge.name)
        .replaceAll('{teamUrl}', provider.escapeUrl(teamUrl))
        .replaceAll('{teamName}', provider.escapeText(user.name))
      return provider.sendMarkdown(message)
    })
  )
}
