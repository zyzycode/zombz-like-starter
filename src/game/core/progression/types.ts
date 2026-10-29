export type Stats = {
  maxHp: number;
  damage: number;
  moveSpeed: number;
  maxMana: number;
  manaRegen: number;
  spellPower: number;
  armor: number;
};

export const ITEM_SLOTS = ['weapon', 'armor', 'charm', 'helmet', 'boots'] as const;
export type ItemSlot = typeof ITEM_SLOTS[number];
export type Rarity = 'common' | 'rare' | 'epic';
export type ActiveAbilityId = 'whirlwind' | 'frostWave' | 'mend';
export type SkillId = 'warrior1' | 'warrior2' | 'warrior3' | 'mage1' | 'mage2' | 'mage3' | 'survivor1' | 'survivor2' | 'survivor3';
export type MetaUpgradeId = 'vitality' | 'might' | 'wisdom';
export type MetaRanks = Record<MetaUpgradeId, number>;
export type ItemDefinition = {
  id: string;
  name: string;
  description: string;
  slot: ItemSlot;
  baseBonuses: Readonly<Partial<Stats>>;
};
export type Item = {
  id: string;
  definitionId: string;
  description: string;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  bonuses: Partial<Stats>;
};
export type EquipmentPreview = { stats: Stats; delta: Stats };
export type EquipmentPreviews = {
  equip: Record<string, EquipmentPreview>;
  unequip: Partial<Record<ItemSlot, EquipmentPreview>>;
};
export type BuildResourcePolicy = 'preserve-deficit' | 'preserve-current';

export type BuildState = {
  level: number;
  xp: number;
  xpToNext: number;
  skillPoints: number;
  skills: Record<SkillId, number>;
  unlockedAbilities: ActiveAbilityId[];
  inventory: Item[];
  equipment: Partial<Record<ItemSlot, string>>;
  equipmentPreviews: EquipmentPreviews;
  stats: Stats;
};
