import type { MetaUpgradeId } from '@/game/core/progression/types';
import { createMetaProfile, isMetaProfile, type MetaProfile, type MetaProfileRepository } from '@/game/core/meta/MetaProfile';

export type { MetaProfile, MetaProfileRepository } from '@/game/core/meta/MetaProfile';
export type { MetaUpgradeId } from '@/game/core/progression/types';
export const META_UPGRADES: readonly { id: MetaUpgradeId; name: string; description: string; maxRank: number; baseCost: number }[] = [
  { id: 'vitality', name: 'Наследие жизни', description: '+10 здоровья в новых забегах', maxRank: 5, baseCost: 8 },
  { id: 'might', name: 'Наследие стали', description: '+5 урона оружия в новых забегах', maxRank: 5, baseCost: 10 },
  { id: 'wisdom', name: 'Наследие магии', description: '+10 маны и +5% силы заклинаний', maxRank: 5, baseCost: 10 },
];

export class MetaProgression {
  private profile: MetaProfile;

  constructor(private readonly repository: MetaProfileRepository) {
    const loaded = repository.load();
    this.profile = isMetaProfile(loaded) ? structuredClone(loaded) : createMetaProfile();
  }

  getState(): MetaProfile { return structuredClone(this.profile); }
  getError(): string | null { return this.repository.errorMessage; }

  award(runId: string, clearedLevels: number, victory: boolean): boolean {
    if (!runId || runId.length > 128 || this.profile.claimedRunIds.includes(runId)) return false;
    if (!Number.isFinite(clearedLevels)) return false;
    const depth = Math.max(0, Math.min(9, Math.floor(clearedLevels)));
    this.profile.shards += depth * 4 + (victory ? 12 : 0);
    this.profile.bestDepth = Math.max(this.profile.bestDepth, depth);
    this.profile.runs += 1;
    this.profile.claimedRunIds.push(runId);
    this.repository.save(this.profile);
    return true;
  }

  purchase(id: MetaUpgradeId): boolean {
    const upgrade = META_UPGRADES.find((item) => item.id === id);
    if (!upgrade) return false;
    const rank = this.profile.ranks[id];
    const cost = upgrade.baseCost * (rank + 1);
    if (rank >= upgrade.maxRank || this.profile.shards < cost) return false;
    this.profile.shards -= cost;
    this.profile.ranks[id] += 1;
    this.repository.save(this.profile);
    return true;
  }
}
