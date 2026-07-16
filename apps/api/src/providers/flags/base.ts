import { z } from 'zod/mini'
import { BaseProvider } from '../base'

export type FlagProviderConfig = Record<string, unknown>

// Context of the team a flag is verified against or minted for. Providers
// with per-team flags (e.g. flags/dynamic) need it; others may ignore it.
export interface FlagTeamContext {
  teamId: string
  challengeId: string
}

export enum FlagVerifyStatus {
  // The submission is a valid flag for the submitting team.
  ACCEPTED = 'accepted',
  // An ordinary wrong guess.
  REJECTED = 'rejected',
  // A valid flag that was not minted for the submitting team — the
  // fingerprint of a flag shared from another team rather than a wrong guess.
  CHEATED = 'cheated',
}

export interface FlagVerifyResult {
  status: FlagVerifyStatus
}

export abstract class FlagProvider extends BaseProvider {
  abstract readonly configSchema: z.ZodMiniType<FlagProviderConfig, unknown>

  async verify(
    config: FlagProviderConfig,
    submitted: string,
    context: FlagTeamContext
  ): Promise<FlagVerifyResult> {
    const parsed = this.configSchema.safeParse(config)
    if (!parsed.success) {
      return { status: FlagVerifyStatus.REJECTED }
    }
    return await this.verifyParsed(parsed.data, submitted, context)
  }

  async getForTeam(
    config: FlagProviderConfig,
    context: FlagTeamContext
  ): Promise<string | null> {
    const parsed = this.configSchema.safeParse(config)
    if (!parsed.success) {
      return null
    }
    return await this.getForTeamParsed(parsed.data, context)
  }

  protected abstract verifyParsed(
    config: FlagProviderConfig,
    submitted: string,
    context: FlagTeamContext
  ): Promise<FlagVerifyResult>

  protected abstract getForTeamParsed(
    config: FlagProviderConfig,
    context: FlagTeamContext
  ): Promise<string | null>
}
