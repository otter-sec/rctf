export interface ACL {
  match: string
  value: string
  divisions: (keyof ServerConfig['divisions'])[]
}

export interface ProviderConfig {
  name: string
  options: unknown
}

export interface Sponsor {
  name: string
  icon: string
  description: string
  small?: boolean
}

export interface ServerConfig {
  database: {
    sql:
      | string
      | {
          host: string
          port: number
          user: string
          password: string
          database: string
        }
    redis:
      | string
      | {
          host: string
          port: number
          password: string
          database: number
        }
    migrate: 'before' | 'only' | 'never'
  }
  instanceType: 'leaderboard' | 'all' | 'frontend'
  tokenKey: string
  origin: string

  proxy: {
    cloudflare: boolean
    trust: boolean | string | string[] | number
  }

  ctftime?: {
    clientId: string
    clientSecret: string
  }

  userMembers: boolean
  registrationsEnabled: boolean

  sponsors: Sponsor[]
  homeContent: string
  ctfName: string
  meta: {
    description: string
    imageUrl: string
  }
  faviconUrl?: string
  globalSiteTag?: string

  challengeProvider: ProviderConfig
  uploadProvider: ProviderConfig
  scoreProvider: ProviderConfig

  email?: {
    provider: ProviderConfig
    from: string
    logoUrl?: string
  }

  divisions: Record<string, string>
  defaultDivision?: string
  divisionACLs?: ACL[]

  startTime: number
  endTime: number

  leaderboard: {
    maxLimit: number
    maxOffset: number
    updateInterval: number
    graphMaxTeams: number
    graphSampleTime: number
  }
  loginTimeout: number
}
