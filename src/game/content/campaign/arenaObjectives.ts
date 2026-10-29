import type { ObeliskDefinition } from '@/game/core/environment/Obelisk';
import type { CampaignStage } from '@/game/content/campaign/campaign';

const positions: Record<string, [number, number][]> = {
  'ruins-1': [[624, 144]],
  'ruins-2': [[624, 176], [432, 560]],
  'frost-1': [[656, 208], [464, 560]],
};

/** Objective routes use existing obelisk art, away from other E interactions. */
export function createArenaObelisks(stage: CampaignStage): ObeliskDefinition[] {
  return (positions[stage.id] ?? []).map(([x, y], index) => ({
    id: `${stage.id}-obelisk-${index + 1}`, position: { x, y }, radius: 44,
  }));
}
