import type { Player } from '@/game/core/characters/Player';
import type { RestorationSiteState } from '@/game/core/environment/RestorationSite';
import type { InputState } from '@/shared/types/game';

/** Each level owns its supplies; using one never changes the run ledger or profile. */
export class RestorationSystem {
  private readonly sites: RestorationSiteState[];

  constructor(sites: RestorationSiteState[]) {
    this.sites = structuredClone(sites);
  }

  getState(): RestorationSiteState[] { return structuredClone(this.sites); }

  update(player: Player, input: InputState) {
    if (!input.interactPressed || !player.isAlive) return;
    let nearest: RestorationSiteState | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const site of this.sites) {
      if (site.used) continue;
      const distance = Math.hypot(player.position.x - site.position.x, player.position.y - site.position.y);
      if (distance <= site.radius + player.radius && distance < nearestDistance) {
        nearest = site;
        nearestDistance = distance;
      }
    }
    if (nearest && player.restoreResources(nearest.healthFraction, nearest.manaFraction)) nearest.used = true;
  }
}
