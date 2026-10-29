import type { CampaignStage } from '@/game/content/campaign/campaign';

/** A heavier melee route at the same depth as the hunter trail. */
export const GROVE_ALTERNATE: CampaignStage = {
  id: 'grove-alt',
  name: 'Курган стражей',
  biome: 'Заросшая роща',
  biomeId: 'grove',
  color: '#78c99b',
  description: 'Ближний бой без стрелков и рун. Обходи тяжёлого стража, а броню элитного скелета пробивай магией. Тайник — на востоке, источник — на юго-западе.',
  encounters: [
    [{ archetypeId: 'grunt', count: 3 }],
    [{ archetypeId: 'grunt', count: 2 }, { archetypeId: 'grunt', count: 1, elite: 'armored' }, { archetypeId: 'brute', count: 1 }],
  ],
};
