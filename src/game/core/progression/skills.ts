import type { SkillId, Stats } from '@/game/core/progression/types';

export type SkillDefinition = {
  id: SkillId;
  name: string;
  description: string;
  prerequisite: SkillId | null;
  maxRank: number;
  bonuses: Partial<Stats>;
};

export const SKILLS: readonly SkillDefinition[] = [
  { id: 'warrior1', name: 'Сила удара', description: '+12 к урону оружия за ранг', prerequisite: null, maxRank: 3, bonuses: { damage: 12 } },
  { id: 'warrior2', name: 'Боевой доспех', description: '+3 брони и +8 урона за ранг', prerequisite: 'warrior1', maxRank: 3, bonuses: { armor: 3, damage: 8 } },
  { id: 'mage1', name: 'Чародейство', description: '+25% силы заклинаний за ранг', prerequisite: null, maxRank: 3, bonuses: { spellPower: 0.25 } },
  { id: 'mage2', name: 'Источник маны', description: '+25 маны и +3 восстановления за ранг', prerequisite: 'mage1', maxRank: 3, bonuses: { maxMana: 25, manaRegen: 3 } },
  { id: 'survivor1', name: 'Выносливость', description: '+25 максимального здоровья за ранг', prerequisite: null, maxRank: 3, bonuses: { maxHp: 25 } },
  { id: 'survivor2', name: 'Лёгкий шаг', description: '+20 скорости и +2 брони за ранг', prerequisite: 'survivor1', maxRank: 3, bonuses: { moveSpeed: 20, armor: 2 } },
];
