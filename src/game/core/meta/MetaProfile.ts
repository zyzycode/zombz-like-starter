import type { MetaRanks } from '@/game/core/progression/types';

export type MetaProfile = {
  version: 1;
  shards: number;
  ranks: MetaRanks;
  claimedRunIds: string[];
  bestDepth: number;
  runs: number;
};

export interface MetaProfileRepository {
  readonly errorMessage: string | null;
  load(): MetaProfile;
  save(profile: MetaProfile): boolean;
}

export function createMetaProfile(): MetaProfile {
  return { version: 1, shards: 0, ranks: { vitality: 0, might: 0, wisdom: 0 }, claimedRunIds: [], bestDepth: 0, runs: 0 };
}

/** Invalid stored data is rejected as a whole, rather than becoming trusted game state. */
export function isMetaProfile(value: unknown): value is MetaProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Record<string, unknown>;
  const ranks = profile.ranks;
  if (!ranks || typeof ranks !== 'object') return false;
  const rankRecord = ranks as Record<string, unknown>;
  return profile.version === 1
    && integerWithin(profile.shards, 0, 1_000_000_000)
    && integerWithin(profile.bestDepth, 0, 6)
    && integerWithin(profile.runs, 0, 1_000_000_000)
    && ['vitality', 'might', 'wisdom'].every((key) => integerWithin(rankRecord[key], 0, 5))
    && Array.isArray(profile.claimedRunIds)
    && profile.claimedRunIds.length <= 100_000
    && profile.claimedRunIds.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 128)
    && new Set(profile.claimedRunIds).size === profile.claimedRunIds.length;
}

function integerWithin(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}
