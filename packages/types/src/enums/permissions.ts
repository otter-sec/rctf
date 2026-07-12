export enum Permissions {
  challsRead = 1 << 0,
  challsWrite = 1 << 1,
  leaderboardRead = 1 << 2,
  challsSolveWrite = 1 << 3,
  usersWrite = 1 << 4,
  settingsWrite = 1 << 5,
}

export const ALL_PERMISSIONS = Object.values(Permissions)
  .filter((value): value is number => typeof value === 'number')
  .reduce((acc, value) => acc | value, 0)
