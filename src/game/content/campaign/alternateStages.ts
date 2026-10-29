import type { CampaignStage } from '@/game/content/campaign/campaign';

/** A heavier melee route at the same depth as the hunter trail. */
export const GROVE_ALTERNATE: CampaignStage = {
  id: 'grove-alt',
  name: 'Курган стражей',
  biome: 'Заросшая роща',
  biomeId: 'grove',
  color: '#78c99b',
  description: 'Ближний бой без стрелков и рун. Обходи тяжёлого стража, а броню элитного скелета пробивай магией. Исследуй боковые комнаты ради тайников и источника.',
  encounters: [
    [{ archetypeId: 'grunt', count: 3 }],
    [{ archetypeId: 'grunt', count: 2 }, { archetypeId: 'grunt', count: 1, elite: 'armored' }, { archetypeId: 'brute', count: 1 }],
  ],
};

/** Open firing lanes trade the library's armored guards for ranged pressure. */
export const RUINS_ALTERNATE: CampaignStage = {
  id: 'ruins-alt',
  name: 'Пепельный проход',
  biome: 'Пепельные руины',
  biomeId: 'ruins',
  color: '#e6b878',
  description: 'Стрелки держат открытые проходы, а стремительный охотник теснит в ближнем бою. Используй повороты стен против стрелков и активируй один обелиск. В боковых комнатах ищи тайники и источник.',
  encounters: [
    [{ archetypeId: 'ranged', count: 2 }, { archetypeId: 'grunt', count: 1 }],
    [{ archetypeId: 'ranged', count: 1 }, { archetypeId: 'runner', count: 2 }, { archetypeId: 'runner', count: 1, elite: 'swift' }],
  ],
};
