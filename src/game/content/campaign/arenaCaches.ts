import type { ExplorationCacheDefinition } from '@/game/core/environment/ExplorationCache';
import type { CampaignStage } from '@/game/content/campaign/campaign';

const positions: Record<string, [number, number]> = {
  'grove-1': [800, 288],
  'grove-2': [736, 544],
  'grove-alt': [800, 352],
  'ruins-1': [800, 208],
  'ruins-2': [224, 576],
  'ruins-alt': [800, 560],
  'frost-1': [848, 288],
  'frost-2': [144, 192],
};

/** Side-route caches stay clear of hazards, scenery and the level's spring. */
export function createArenaCaches(stage: CampaignStage): ExplorationCacheDefinition[] {
  const position = positions[stage.id];
  if (!position) return [];
  return [{ id: `${stage.id}-cache`, position: { x: position[0], y: position[1] }, radius: 44 }];
}
