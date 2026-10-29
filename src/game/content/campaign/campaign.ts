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
  { id: 'ruins-1', name: 'Разбитый двор', biome: 'Пепельные руины', biomeId: 'ruins', color: '#e6b878', description: 'Победи стражей и активируй обелиск на E во время боя или после него. Против бронированного стража применяй магию.', encounters: [[pack('ranged', 2), pack('grunt', 2)], [pack('brute', 1, 'armored'), pack('runner', 2)]] },
  { id: 'ruins-2', name: 'Зал забытых', biome: 'Пепельные руины', biomeId: 'ruins', color: '#e6b878', description: 'Активируй два обелиска на E и зачисти зал. Их можно включить после боя; магия обходит броню элитного стража.', encounters: [[pack('brute', 1), pack('brute', 1, 'armored')], [pack('ranged', 2), pack('runner', 3)]] },
  { id: 'frost-1', name: 'Ледяной порог', biome: 'Мёрзлое святилище', biomeId: 'frost', color: '#8dc7ef', description: 'Зачисти порог и активируй два обелиска на E во время боя или после. Сохрани ману против бронированного стража.', encounters: [[pack('ranged', 3), pack('runner', 2)], [pack('brute', 2), pack('grunt', 1), pack('grunt', 1, 'armored')]] },
  { id: 'grove-maze', name: 'Корни забвения', biome: 'Заросшая роща', biomeId: 'grove', color: '#78c99b', description: 'Лесные стены скрывают боковые тропы и тупики. Найди два обелиска и два тайника; источник находится в западных комнатах.', encounters: [[pack('runner', 4), pack('grunt', 2)], [pack('runner', 2, 'swift'), pack('ranged', 3), pack('brute', 1)]] },
  { id: 'ruins-maze', name: 'Катакомбы пепла', biome: 'Пепельные руины', biomeId: 'ruins', color: '#e6b878', description: 'Каменные галереи петляют между залами. Используй повороты против стрелков и активируй оба обелиска в восточном крыле.', encounters: [[pack('ranged', 4), pack('grunt', 2)], [pack('brute', 2, 'armored'), pack('runner', 3), pack('ranged', 2)]] },
  { id: 'frost-maze', name: 'Ледяной лабиринт', biome: 'Мёрзлое святилище', biomeId: 'frost', color: '#8dc7ef', description: 'Снежные проходы огибают внутренние комнаты и заканчиваются тайниками. Два обелиска откроют путь к хранителю.', encounters: [[pack('runner', 3), pack('ranged', 3), pack('grunt', 1, 'armored')], [pack('brute', 2), pack('runner', 2, 'swift'), pack('ranged', 3)]] },
  { id: 'frost-2', name: 'Сердце зимы', biome: 'Мёрзлое святилище', biomeId: 'frost', color: '#8dc7ef', description: 'Перед хранителем атакует стремительный охотник. Он движется быстрее, но замах всё ещё можно прервать.', encounters: [[pack('runner', 2), pack('runner', 1, 'swift')], [pack('boss', 1), pack('ranged', 2)]] },
];
