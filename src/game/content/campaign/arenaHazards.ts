import type { ArenaHazardDefinition } from '@/game/core/environment/ArenaHazard';
import type { CampaignStage } from '@/game/content/campaign/campaign';

const placements: Record<string, [number, number][]> = {
  'grove-1': [],
  'grove-2': [[640, 256]],
  'ruins-1': [[480, 192], [480, 512]],
  'ruins-2': [[352, 224], [608, 480]],
  'frost-1': [[352, 192], [640, 416]],
  'frost-2': [[480, 176], [352, 352], [608, 352]],
};

/** Runes sit on combat routes, leaving the start, supply sites and spawn pockets safe. */
export function createArenaHazards(stage: CampaignStage): ArenaHazardDefinition[] {
  return (placements[stage.id] ?? []).map(([x, y], index) => ({
    id: `${stage.id}-rune-${index}`, position: { x, y },
    radius: stage.id === 'frost-2' ? 48 : 42,
    damage: stage.biomeId === 'grove' ? 20 : stage.biomeId === 'ruins' ? 26 : 30,
    damageType: 'magic', theme: stage.biomeId === 'frost' ? 'frost' : 'fire',
    cooldownMs: 3600, warningMs: 1100, activeMs: 320, initialDelayMs: 2400 + index * 1400,
  }));
}
