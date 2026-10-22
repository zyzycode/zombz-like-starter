export type Stats = {
  maxHp: number;
  damage: number;
  moveSpeed: number;
  maxMana: number;
  manaRegen: number;
  spellPower: number;
  armor: number;
};

export type ItemSlot = 'weapon' | 'armor' | 'charm';
export type Rarity = 'common' | 'rare' | 'epic';
export type SkillId = 'warrior1' | 'warrior2' | 'mage1' | 'mage2' | 'survivor1' | 'survivor2';
export type MetaUpgradeId = 'vitality' | 'might' | 'wisdom';
export type MetaRanks = Record<MetaUpgradeId, number>;
export type Item = {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  bonuses: Partial<Stats>;
};
export type BuildState = {
  level: number;
  xp: number;
  xpToNext: number;
  skillPoints: number;
  skills: Record<SkillId, number>;
  inventory: Item[];
  equipment: Partial<Record<ItemSlot, string>>;
  stats: Stats;
};
