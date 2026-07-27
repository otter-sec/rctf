import { dynamicFlags } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  FlagProvider,
  FlagVerifyStatus,
  type FlagTeamContext,
  type FlagVerifyResult,
} from '../base'
import { type DynamicFlagConfig, dynamicFlagConfigSchema } from './config'
import {
  type Carrier,
  DynamicFlagExhaustion,
  DynamicFlagMode,
  type ParsedDynamicFlag,
  parseDynamicFlag,
} from './format'
import { countDynamicFlagCarrierBits } from './leet'
import { pickCarrier, randomizeFlag } from './mint'

const MAX_MINT_ATTEMPTS = 5

export default class DynamicFlagProvider extends FlagProvider {
  readonly configSchema = dynamicFlagConfigSchema

  protected async verifyParsed(
    config: DynamicFlagConfig,
    submitted: string,
    context: FlagTeamContext
  ): Promise<FlagVerifyResult> {
    const owner = await context.db
      .select({ userId: dynamicFlags.userId })
      .from(dynamicFlags)
      .where(
        and(
          eq(dynamicFlags.challengeId, context.challengeId),
          eq(dynamicFlags.base, config.base),
          eq(dynamicFlags.flag, submitted)
        )
      )
      .orderBy(
        desc(sql`${dynamicFlags.userId} = ${context.teamId}`),
        asc(dynamicFlags.createdAt)
      )
      .limit(1)
      .then(takeUnique)

    if (!owner) {
      return { status: FlagVerifyStatus.REJECTED }
    }
    return owner.userId === context.teamId
      ? { status: FlagVerifyStatus.ACCEPTED }
      : { status: FlagVerifyStatus.CHEATED, cheatedFromTeamId: owner.userId }
  }

  protected async getForTeamParsed(
    config: DynamicFlagConfig,
    context: FlagTeamContext
  ): Promise<string | null> {
    const parsed = parseDynamicFlag(config.base)
    if (!parsed) {
      return null
    }

    const carrier = pickCarrier(parsed, config.mode)
    if (carrier === null) {
      return null
    }

    const existing = await this.readTeamFlag(config, context)
    if (existing !== null) {
      return existing
    }

    // the leet variant space is finite
    const carriers: Carrier[] =
      carrier === DynamicFlagMode.LEET &&
      config.exhaustion === DynamicFlagExhaustion.TAIL
        ? [DynamicFlagMode.LEET, DynamicFlagMode.TAIL]
        : [carrier]

    for (const attemptCarrier of carriers) {
      while (true) {
        for (let attempt = 0; attempt < MAX_MINT_ATTEMPTS; attempt++) {
          const inserted = await this.insertTeamFlag(
            randomizeFlag(parsed, attemptCarrier),
            config,
            context
          )
          if (inserted !== null) {
            return inserted
          }

          const concurrent = await this.readTeamFlag(config, context)
          if (concurrent !== null) {
            return concurrent
          }
        }

        if (
          attemptCarrier !== DynamicFlagMode.LEET ||
          (await this.isLeetSpaceExhausted(parsed, config, context))
        ) {
          break
        }
      }
    }

    if (config.exhaustion !== DynamicFlagExhaustion.DUPLICATE) {
      return null
    }

    // space exhausted
    const duplicate = await this.insertTeamFlag(
      randomizeFlag(parsed, carrier),
      config,
      context,
      true
    )
    if (duplicate !== null) {
      return duplicate
    }
    return await this.readTeamFlag(config, context)
  }

  private async isLeetSpaceExhausted(
    parsed: ParsedDynamicFlag,
    config: DynamicFlagConfig,
    context: FlagTeamContext
  ): Promise<boolean> {
    const carrierBits = countDynamicFlagCarrierBits(parsed.content)
    const capacity = 1n << BigInt(carrierBits)
    const row = await context.db
      .select({
        count: sql<string>`COUNT(DISTINCT ${dynamicFlags.flag})::text`.as(
          'variant_count'
        ),
      })
      .from(dynamicFlags)
      .where(
        and(
          eq(dynamicFlags.challengeId, context.challengeId),
          eq(dynamicFlags.base, config.base),
          // leet only
          sql`char_length(${dynamicFlags.flag}) = char_length(${config.base})`
        )
      )
      .then(takeUnique)
    return BigInt(row?.count ?? '0') >= capacity
  }

  private async readTeamFlag(
    config: DynamicFlagConfig,
    context: FlagTeamContext
  ): Promise<string | null> {
    const existing = await context.db
      .select({ flag: dynamicFlags.flag })
      .from(dynamicFlags)
      .where(
        and(
          eq(dynamicFlags.challengeId, context.challengeId),
          eq(dynamicFlags.userId, context.teamId),
          eq(dynamicFlags.base, config.base)
        )
      )
      .limit(1)
      .then(takeUnique)
    return existing?.flag ?? null
  }

  private async insertTeamFlag(
    flag: string,
    config: DynamicFlagConfig,
    context: FlagTeamContext,
    allowDuplicate = false
  ): Promise<string | null> {
    const inserted = await context.db
      .insert(dynamicFlags)
      .values({
        challengeId: context.challengeId,
        userId: context.teamId,
        base: config.base,
        flag,
        allowDuplicate,
      })
      .onConflictDoNothing()
      .returning({ flag: dynamicFlags.flag })
      .then(takeUnique)
    return inserted?.flag ?? null
  }
}
