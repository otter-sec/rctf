import type { ChallengeData, User } from '@rctf/db'
import { getTimeOrdinal } from '@rctf/util'
import type { MessageProvider } from '../providers/messages/base'

const BLOOD_NUM_WORDS = ['first', 'second', 'third'] as const

const capitalize = (value: string) =>
  value.length > 0 ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value

export const buildBloodMessageView = ({
  user,
  challenge,
  bloodNumber,
  bloodEmojis,
  origin,
  provider,
}: {
  user: Pick<User, 'id' | 'name'>
  challenge: Pick<ChallengeData, 'category' | 'name'>
  bloodNumber: number
  bloodEmojis: string[]
  origin: string
  provider: Pick<MessageProvider, 'escapeText' | 'escapeUrl'>
}) => {
  const teamUrl = `${origin}/profile/${user.id}`
  const bloodNumOrdinal = getTimeOrdinal(bloodNumber)
  const bloodNumWord = BLOOD_NUM_WORDS[bloodNumber - 1] ?? bloodNumOrdinal

  return {
    bloodEmoji: bloodEmojis[bloodNumber - 1] ?? '',
    bloodNumber,
    bloodNumOrdinal,
    bloodNumSentence: bloodNumOrdinal,
    bloodNumTitle: capitalize(bloodNumWord),
    bloodNumWord,
    challengeCategory: challenge.category,
    challengeName: challenge.name,
    teamUrl: provider.escapeUrl(teamUrl),
    teamName: provider.escapeText(user.name),
  }
}
