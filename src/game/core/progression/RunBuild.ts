import { ITEM_DEFINITIONS } from '@/game/content/items/itemCatalog';
import { ITEM_SLOTS } from '@/game/core/progression/types';
import { SKILLS } from '@/game/core/progression/skills';
import type { EquipmentPreview, EquipmentPreviews, BuildState, Item, ItemSlot, MetaRanks, Rarity, SkillId, Stats } from '@/game/core/progression/types';

export { SKILLS } from '@/game/core/progression/skills';
export type { BuildState, Item, ItemSlot, MetaRanks, Rarity, SkillId, Stats } from '@/game/core/progression/types';

const BASE_STATS: Stats = { maxHp: 100, damage: 50, moveSpeed: 280, maxMana: 100, manaRegen: 10, spellPower: 1, armor: 0 };
/** Temporary character build. It has no world, rendering or persistence dependencies. */
export class RunBuild {
  private level = 1;
  private xp = 0;
  private skillPoints = 0;
  private skills: Record<SkillId, number> = { warrior1: 0, warrior2: 0, warrior3: 0, mage1: 0, mage2: 0, mage3: 0, survivor1: 0, survivor2: 0, survivor3: 0 };
  private inventory: Item[] = [];
  private equipment: Partial<Record<ItemSlot, string>> = {};
  private rewards: Item[] = [];
  private rewardSequence = 0;
  private readonly claimedCaches = new Set<string>();
  private readonly metaRanks: MetaRanks;

  constructor(metaRanks: Partial<MetaRanks> = {}, private readonly random: () => number = Math.random) {
    this.metaRanks = {
      vitality: validRank(metaRanks.vitality),
      might: validRank(metaRanks.might),
      wisdom: validRank(metaRanks.wisdom),
    };
  }

  getState(): BuildState {
    const stats = this.calculateStats();
    return structuredClone({
      level: this.level, xp: this.xp, xpToNext: this.xpToNext(), skillPoints: this.skillPoints,
      unlockedAbilities: SKILLS.flatMap((skill) => skill.unlocksAbility && this.skills[skill.id] > 0 ? [skill.unlocksAbility] : []),
      skills: this.skills, inventory: this.inventory, equipment: this.equipment, stats, equipmentPreviews: this.createEquipmentPreviews(stats),
    });
  }

  gainXp(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.xp += Math.floor(amount);
    while (this.xp >= this.xpToNext()) {
      this.xp -= this.xpToNext();
      this.level += 1;
      this.skillPoints += 1;
    }
  }

  /** Alternate accessory slots so every offer stays a choice of three distinct slots. */
  createRewards(depth: number): Item[] {
    if (this.rewards.length) return structuredClone(this.rewards);
    const tier = Math.max(1, Math.min(10, Math.floor(Number.isFinite(depth) ? depth : 1)));
    const slots: readonly ItemSlot[] = tier % 2 === 1
      ? ['weapon', 'armor', 'charm'] : ['weapon', 'helmet', 'boots'];
    this.rewardSequence += 1;
    this.rewards = slots.map((slot, index) => this.createItem(slot, tier, `reward-${this.rewardSequence}-${index}`));
    return structuredClone(this.rewards);
  }

  claimCache(cacheId: string, depth: number): Item | null {
    if (!cacheId || this.claimedCaches.has(cacheId)) return null;
    const tier = Math.max(1, Math.min(10, Math.floor(Number.isFinite(depth) ? depth : 1)));
    const slot = ITEM_SLOTS[Math.floor(this.roll() * ITEM_SLOTS.length)];
    const item = this.createItem(slot, tier, `cache:${cacheId}`);
    this.claimedCaches.add(cacheId);
    this.inventory.push(item);
    return structuredClone(item);
  }

  private createItem(slot: ItemSlot, tier: number, id: string): Item {
    const roll = this.roll();
    const rarity: Rarity = roll < 0.12 + tier * 0.015 ? 'epic' : roll < 0.43 + tier * 0.02 ? 'rare' : 'common';
    const strength = (1 + tier * 0.2) * (rarity === 'epic' ? 1.8 : rarity === 'rare' ? 1.35 : 1);
    const candidates = ITEM_DEFINITIONS.filter((item) => item.slot === slot);
    const definition = candidates[Math.floor(this.roll() * candidates.length)];
    if (!definition) throw new Error(`Нет предметов для слота ${slot}`);
    const bonuses: Partial<Stats> = {};
    for (const key of Object.keys(definition.baseBonuses) as (keyof Stats)[]) {
      const value = (definition.baseBonuses[key] ?? 0) * strength;
      bonuses[key] = key === 'spellPower' ? Math.round(value * 100) / 100 : Math.round(value);
    }
    return { id, definitionId: definition.id, name: definition.name, description: definition.description, slot, rarity, bonuses };
  }

  claimReward(itemId: string): boolean {
    const reward = this.rewards.find((item) => item.id === itemId);
    if (!reward) return false;
    this.inventory.push(reward);
    this.rewards = [];
    // First item in a slot is immediately useful. Replacements remain the player's choice.
    if (!this.equipment[reward.slot]) this.equipment[reward.slot] = reward.id;
    return true;
  }

  equip(itemId: string): boolean {
    const item = this.inventory.find((candidate) => candidate.id === itemId);
    if (!item || this.equipment[item.slot] === item.id) return false;
    this.equipment[item.slot] = item.id;
    return true;
  }

  unequip(slot: ItemSlot): boolean {
    if (!this.equipment[slot]) return false;
    delete this.equipment[slot];
    return true;
  }

  private createEquipmentPreviews(current: Stats): EquipmentPreviews {
    const equip: EquipmentPreviews['equip'] = {};
    const unequip: EquipmentPreviews['unequip'] = {};
    for (const item of this.inventory) {
      equip[item.id] = this.previewEquipment({ ...this.equipment, [item.slot]: item.id }, current);
    }
    for (const slot of ITEM_SLOTS) {
      if (!this.equipment[slot]) continue;
      const equipment = { ...this.equipment };
      delete equipment[slot];
      unequip[slot] = this.previewEquipment(equipment, current);
    }
    return { equip, unequip };
  }

  private previewEquipment(equipment: Partial<Record<ItemSlot, string>>, current: Stats): EquipmentPreview {
    const stats = this.calculateStats(equipment);
    const delta = { ...stats };
    for (const key of Object.keys(stats) as (keyof Stats)[]) {
      delta[key] = Math.round((stats[key] - current[key]) * 10000) / 10000;
    }
    return { stats, delta };
  }

  learn(skillId: SkillId): boolean {
    const definition = SKILLS.find((skill) => skill.id === skillId);
    if (!definition || this.skillPoints <= 0 || this.skills[skillId] >= definition.maxRank) return false;
    if (definition.prerequisite && this.skills[definition.prerequisite] === 0) return false;
    this.skills[skillId] += 1;
    this.skillPoints -= 1;
    return true;
  }

  private xpToNext() { return 40 + (this.level - 1) * 25; }

  private calculateStats(equipment = this.equipment): Stats {
    const stats = { ...BASE_STATS };
    stats.maxHp += this.metaRanks.vitality * 10;
    stats.damage += this.metaRanks.might * 5;
    stats.maxMana += this.metaRanks.wisdom * 10;
    stats.spellPower += this.metaRanks.wisdom * 0.05;
    const add = (bonuses: Partial<Stats>, scale = 1) => {
      for (const key of Object.keys(bonuses) as (keyof Stats)[]) stats[key] += (bonuses[key] ?? 0) * scale;
    };
    for (const definition of SKILLS) add(definition.bonuses, this.skills[definition.id]);
    for (const item of this.inventory) if (equipment[item.slot] === item.id) add(item.bonuses);
    stats.spellPower = Math.round(stats.spellPower * 100) / 100;
    return stats;
  }

  private roll() {
    const value = this.random();
    return Number.isFinite(value) ? Math.max(0, Math.min(0.999999, value)) : 0.5;
  }
}

function validRank(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.min(5, Math.floor(value ?? 0))) : 0;
}
