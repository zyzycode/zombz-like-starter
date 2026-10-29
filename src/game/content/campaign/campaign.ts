import type { EnemyArchetypeId } from '@/game/config/enemies/enemyArchetypes';
import type { EliteModifierId } from '@/shared/types/game';
import type { WaveSpawnEntry } from '@/game/core/waves/WaveDirector';
export type StageInfo = { name: string; biome: string; description: string; color: string };

export type CampaignStage = StageInfo & {
  id: string;
  biomeId: 'grove' | 'ruins' | 'frost';
  encounters: WaveSpawnEntry[][];
};
const pack = (archetypeId: EnemyArchetypeId, count: number, elite?: EliteModifierId): WaveSpawnEntry => ({ archetypeId, count, ...(elite ? { elite } : {}) });
export const CAMPAIGN: CampaignStage[] = [
  { id: 'grove-1', name: 'Тихая опушка', biome: 'Заросшая роща', biomeId: 'grove', color: '#78c99b', description: 'Среди старых камней просыпаются первые стражи.', encounters: [[pack('grunt', 3)], [pack('grunt', 2), pack('runner', 1)]] },
  { id: 'grove-2', name: 'Тропа охотника', biome: 'Заросшая роща', biomeId: 'grove', color: '#78c99b', description: 'Стремительный охотник быстрее сближается, но время его замаха прежнее. Встречай его станом.', encounters: [[pack('runner', 2), pack('runner', 1, 'swift')], [pack('grunt', 2), pack('ranged', 2)]] },
  { id: 'ruins-1', name: 'Разбитый двор', biome: 'Пепельные руины', biomeId: 'ruins', color: '#e6b878', description: 'Колонны укроют от стрелков. Бронированный тяжёлый страж выдерживает удары оружия — применяй магию.', encounters: [[pack('ranged', 2), pack('grunt', 2)], [pack('brute', 1, 'armored'), pack('runner', 2)]] },
  { id: 'ruins-2', name: 'Зал забытых', biome: 'Пепельные руины', biomeId: 'ruins', color: '#e6b878', description: 'Один из тяжёлых стражей бронирован. Магия обходит его защиту от оружия; не стой в зоне замаха.', encounters: [[pack('brute', 1), pack('brute', 1, 'armored')], [pack('ranged', 2), pack('runner', 3)]] },
  { id: 'frost-1', name: 'Ледяной порог', biome: 'Мёрзлое святилище', biomeId: 'frost', color: '#8dc7ef', description: 'Бронированный страж сражается рядом с тяжёлыми бойцами. Сохрани ману для него и рывок для выхода из окружения.', encounters: [[pack('ranged', 3), pack('runner', 2)], [pack('brute', 2), pack('grunt', 1), pack('grunt', 1, 'armored')]] },
  { id: 'frost-2', name: 'Сердце зимы', biome: 'Мёрзлое святилище', biomeId: 'frost', color: '#8dc7ef', description: 'Перед хранителем атакует стремительный охотник. Он движется быстрее, но замах всё ещё можно прервать.', encounters: [[pack('runner', 2), pack('runner', 1, 'swift')], [pack('boss', 1), pack('ranged', 2)]] },
];
