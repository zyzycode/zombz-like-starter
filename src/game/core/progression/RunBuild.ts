import { SKILLS } from '@/game/core/progression/skills';
import type { EquipmentPreview, EquipmentPreviews, BuildState, Item, ItemSlot, MetaRanks, Rarity, SkillId, Stats } from '@/game/core/progression/types';

export { SKILLS } from '@/game/core/progression/skills';
export type { BuildState, Item, ItemSlot, MetaRanks, Rarity, SkillId, Stats } from '@/game/core/progression/types';

const BASE_STATS: Stats = { maxHp: 100, damage: 50, moveSpeed: 280, maxMana: 100, manaRegen: 10, spellPower: 1, armor: 0 };
const SLOTS: ItemSlot[] = ['weapon', 'armor', 'charm'];
const NAMES: Record<ItemSlot, string[]> = {
  weapon: ['Клинок странника', 'Топор охотника', 'Сабля хранителя'],
  armor: ['Куртка разведчика', 'Кольчуга стража', 'Панцирь предков'],
  charm: ['Осколок луны', 'Печать пламени', 'Сердце эфира'],
};

/** Temporary character build. It has no world, rendering or persistence dependencies. */
export class RunBuild {
  private level = 1;
  private xp = 0;
  private skillPoints = 0;
  private skills: Record<SkillId, number> = { warrior1: 0, warrior2: 0, mage1: 0, mage2: 0, survivor1: 0, survivor2: 0 };
  private inventory: Item[] = [];
  private equipment: Partial<Record<ItemSlot, string>> = {};
  private rewards: Item[] = [];
  private rewardSequence = 0;
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

  /** Each offer has one weapon, one armour and one charm, with random rarity and bonuses. */
  createRewards(depth: number): Item[] {
    if (this.rewards.length) return structuredClone(this.rewards);
    const tier = Math.max(1, Math.min(10, Math.floor(Number.isFinite(depth) ? depth : 1)));
    this.rewardSequence += 1;
    this.rewards = SLOTS.map((slot, index) => {
      const roll = this.roll();
      const rarity: Rarity = roll < 0.12 + tier * 0.015 ? 'epic' : roll < 0.43 + tier * 0.02 ? 'rare' : 'common';
      const multiplier = rarity === 'epic' ? 1.8 : rarity === 'rare' ? 1.35 : 1;
      const strength = (1 + tier * 0.2) * multiplier;
      const bonuses: Partial<Stats> = slot === 'weapon'
        ? { damage: Math.round(12 * strength), spellPower: this.roll() < 0.4 ? 0.1 * multiplier : 0 }
        : slot === 'armor'
          ? { maxHp: Math.round(18 * strength), armor: Math.round(2 * strength) }
          : { maxMana: Math.round(15 * strength), spellPower: Math.round(15 * strength) / 100, manaRegen: Math.round(2 * multiplier) };
      return { id: `reward-${this.rewardSequence}-${index}`, name: NAMES[slot][Math.floor(this.roll() * NAMES[slot].length)], slot, rarity, bonuses };
    });
    return structuredClone(this.rewards);
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
    for (const slot of SLOTS) {
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
