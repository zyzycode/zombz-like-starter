import type { EnemyArchetypeId } from '@/game/config/enemies/enemyArchetypes';
export type StageInfo = { name: string; biome: string; description: string; color: string };

export type CampaignStage = StageInfo & {
  id: string;
  biomeId: 'grove' | 'ruins' | 'frost';
  encounters: { archetypeId: EnemyArchetypeId; count: number }[][];
};
const pack = (archetypeId: EnemyArchetypeId, count: number) => ({ archetypeId, count });
export const CAMPAIGN: CampaignStage[] = [
  { id: 'grove-1', name: 'Тихая опушка', biome: 'Заросшая роща', biomeId: 'grove', color: '#78c99b', description: 'Среди старых камней просыпаются первые стражи.', encounters: [[pack('grunt', 3)], [pack('grunt', 2), pack('runner', 1)]] },
  { id: 'grove-2', name: 'Тропа охотника', biome: 'Заросшая роща', biomeId: 'grove', color: '#78c99b', description: 'Быстрые охотники не оставят времени на раздумья.', encounters: [[pack('runner', 3)], [pack('grunt', 2), pack('ranged', 2)]] },
  { id: 'ruins-1', name: 'Разбитый двор', biome: 'Пепельные руины', biomeId: 'ruins', color: '#e6b878', description: 'Колонны дают укрытие от огня стрелков.', encounters: [[pack('ranged', 2), pack('grunt', 2)], [pack('brute', 1), pack('runner', 2)]] },
  { id: 'ruins-2', name: 'Зал забытых', biome: 'Пепельные руины', biomeId: 'ruins', color: '#e6b878', description: 'Тяжёлые стражи бьют медленно, но без пощады.', encounters: [[pack('brute', 2)], [pack('ranged', 2), pack('runner', 3)]] },
  { id: 'frost-1', name: 'Ледяной порог', biome: 'Мёрзлое святилище', biomeId: 'frost', color: '#8dc7ef', description: 'Открытые проходы опасны. Держите рывок наготове.', encounters: [[pack('ranged', 3), pack('runner', 2)], [pack('brute', 2), pack('grunt', 2)]] },
  { id: 'frost-2', name: 'Сердце зимы', biome: 'Мёрзлое святилище', biomeId: 'frost', color: '#8dc7ef', description: 'Хранитель пути ждёт в центре святилища.', encounters: [[pack('runner', 3)], [pack('boss', 1), pack('ranged', 2)]] },
];
