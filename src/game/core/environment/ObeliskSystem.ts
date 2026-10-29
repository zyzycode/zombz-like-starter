import type { Player } from '@/game/core/characters/Player';
import type { InputState } from '@/shared/types/game';
import type { ObeliskDefinition, ObeliskState } from './Obelisk';

/** Required level objectives; activation never modifies run rewards or the profile. */
export class ObeliskSystem {
  private readonly obelisks: ObeliskState[];

  constructor(definitions: readonly ObeliskDefinition[]) {
    this.obelisks = definitions.map((obelisk) => ({ ...structuredClone(obelisk), activated: false }));
  }

  getState(): ObeliskState[] { return structuredClone(this.obelisks); }
  isComplete(): boolean { return this.obelisks.every((obelisk) => obelisk.activated); }

  tryActivate(player: Player, input: InputState): boolean {
    if (!player.isAlive || !input.interactPressed) return false;
    let nearest: ObeliskState | undefined;
    let nearestDistance = Infinity;
    for (const obelisk of this.obelisks) {
      if (obelisk.activated) continue;
      const distance = Math.hypot(obelisk.position.x - player.position.x, obelisk.position.y - player.position.y);
      if (distance <= obelisk.radius + player.radius && distance < nearestDistance) {
        nearest = obelisk;
        nearestDistance = distance;
      }
    }
    if (!nearest) return false;
    nearest.activated = true;
    return true;
  }
}
