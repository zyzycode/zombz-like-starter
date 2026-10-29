import { CAMPAIGN, type CampaignStage } from '@/game/content/campaign/campaign';
import { GROVE_ALTERNATE, RUINS_ALTERNATE } from '@/game/content/campaign/alternateStages';

/** Authored forks rejoin at the next depth. Depth remains run progress. */
export function getRouteChoices(depth: number): CampaignStage[] {
  const main = CAMPAIGN[depth - 1];
  if (!main) return [];
  if (depth === 2) return [main, GROVE_ALTERNATE];
  return depth === 4 ? [main, RUINS_ALTERNATE] : [main];
}

export function resolveCampaignStage(depth: number, stageId?: string): CampaignStage | undefined {
  const choices = getRouteChoices(depth);
  return stageId === undefined ? choices[0] : choices.find((stage) => stage.id === stageId);
}
