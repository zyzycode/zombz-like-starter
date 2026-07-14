import { ExtractionZone } from '@/game/core/extraction/ExtractionZone';
import type { Vector2 } from '@/shared/types/game';
import type { RunSession } from '@/game/core/world/RunSession';

type ExtractionActor = {
  position: Vector2;
  radius: number;
  isAlive: boolean;
};

export class ExtractionSystem {
  update(params: {
    actor: ExtractionActor;
    zones: ExtractionZone[];
    deltaMs: number;
    playerTookDamage: boolean;
    runSession: RunSession;
  }) {
    if (!params.actor.isAlive || params.runSession.getResult()) {
      return;
    }

    let activeZoneId: string | null = null;

    for (const zone of params.zones) {
      const insideZone = zone.contains(params.actor.position, params.actor.radius);

      if (insideZone) {
        activeZoneId = zone.id;

        if (params.playerTookDamage) {
          zone.reduceFromDamage(1_500);
        } else {
          zone.advance(params.deltaMs);
        }

        if (zone.isComplete) {
          params.runSession.complete('extracted');
        }

        continue;
      }

      zone.decay(params.deltaMs);
    }

    return {
      activeZoneId,
    };
  }
}
