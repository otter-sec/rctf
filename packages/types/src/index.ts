export interface User {
  id: string
  name: string
  email: string | null
  division: string
  perms: number
  ctftimeId: number | null
  createdAt: Date
}

export interface Challenge {
  id: string
  name: string
  description: string
  category: string
  author: string
  points: number | DynamicPoints
  flag: string
  files: ChallengeFile[]
  tiebreakEligible: boolean
  sortWeight?: number
}

export interface DynamicPoints {
  min: number
  max: number
  current?: number
}

export interface ChallengeFile {
  name: string
  url: string
  size?: number
}

export interface CleanedChallenge {
  id: string
  name: string
  description: string
  category: string
  author: string
  points: number | DynamicPoints
  files: ChallengeFile[]
  sortWeight?: number
}

export interface Solve {
  userId: string
  challengeId: string
  createdAt: Date
}

export interface Team {
  id: string
  name: string
  division: string
  owner: string
  createdAt: Date
}

export interface TeamMember {
  teamId: string
  userId: string
  joinedAt: Date
}

export interface Division {
  name: string
  displayName: string
}

export interface Permission {
  name: string
  value: number
}

export const Permissions = {
  NONE: 0,
  CHAL_READ: 1 << 0,
  CHAL_WRITE: 1 << 1,
  USER_READ: 1 << 2,
  USER_WRITE: 1 << 3,
  LEADERBOARD_READ: 1 << 4,
  ADMIN: 1 << 5,
} as const

export type PermissionValue = typeof Permissions[keyof typeof Permissions]
