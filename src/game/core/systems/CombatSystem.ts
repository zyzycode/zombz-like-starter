import type { AttackPayload } from '@/shared/types/game';
import type { InputState, PlayerState, Vector2 } from '@/shared/types/game';
import { AttackController } from '@/game/core/combat/AttackController';
import { CombatResolver } from '@/game/core/combat/CombatResolver';
import { Player } from '@/game/core/characters/Player';
import { Enemy } from '@/game/core/characters/Enemy';
import { Destructible } from '@/game/core/objects/Destructible';
import { ResourceNode } from '@/game/core/objects/ResourceNode';

type CombatFeedback = {
  hitStopMs: number;
  cameraShakeMs: number;
  cameraShakeIntensity: number;
  impactCount: number;
};

/**
 * Отвечает за player update и резолв боевых последствий попаданий.
 */
export class CombatSystem {
  constructor(
    private readonly attackController = new AttackController(),
    private readonly combatResolver = new CombatResolver(),
  ) {}

  updatePlayer(params: {
    player: Player;
    input: InputState;
    deltaMs: number;
    resolvePosition: (nextPosition: Vector2, radius: number) => Vector2;
  }) {
    const hits: AttackPayload[] = [];

    params.player.update({
      input: params.input,
      deltaMs: params.deltaMs,
      attackController: this.attackController,
      onHit: (attack) => {
        hits.push(attack);
      },
      resolvePosition: params.resolvePosition,
    });

    return hits;
  }

  applyPlayerHits(params: {
    hits: AttackPayload[];
    enemies: Enemy[];
    destructibles: Destructible[];
    resourceNodes: ResourceNode[];
  }) {
    let destructibles = params.destructibles;
    let resourceNodes = params.resourceNodes;
    const destroyedDestructiblesById = new Map<string, Destructible>();
    const destroyedResourceNodesById = new Map<string, ResourceNode>();
    const feedback: CombatFeedback = {
      hitStopMs: 0,
      cameraShakeMs: 0,
      cameraShakeIntensity: 0,
      impactCount: 0,
    };

    for (const hit of params.hits) {
      const enemyResult = this.combatResolver.resolveAttack(hit, params.enemies);
      const destructibleResult = this.combatResolver.resolveAttack(hit, destructibles);
      const resourceNodeResult = this.combatResolver.resolveAttack(hit, resourceNodes);

      for (const item of destructibles) {
        if (!item.isAlive) {
          destroyedDestructiblesById.set(item.id, item);
        }
      }
      for (const item of resourceNodes) {
        if (!item.isAlive) {
          destroyedResourceNodesById.set(item.id, item);
        }
      }

      destructibles = destructibles.filter((item) => item.isAlive);
      resourceNodes = resourceNodes.filter((item) => item.isAlive);

      const totalHits = enemyResult.hitCount + destructibleResult.hitCount + resourceNodeResult.hitCount;
      if (totalHits > 0) {
        feedback.impactCount += totalHits;
        feedback.hitStopMs = Math.max(feedback.hitStopMs, hit.hitStopMs);
        feedback.cameraShakeMs = Math.max(feedback.cameraShakeMs, hit.cameraShakeMs ?? 0);
        feedback.cameraShakeIntensity = Math.max(
          feedback.cameraShakeIntensity,
          hit.cameraShakeIntensity ?? 0,
        );
      }
    }

    return {
      enemies: params.enemies,
      destructibles,
      resourceNodes,
      destroyedDestructibles: [...destroyedDestructiblesById.values()],
      destroyedResourceNodes: [...destroyedResourceNodesById.values()],
      feedback,
    };
  }

  applyEnemyHits(params: {
    hits: AttackPayload[];
    player: Player;
  }) {
    const feedback: CombatFeedback = {
      hitStopMs: 0,
      cameraShakeMs: 0,
      cameraShakeIntensity: 0,
      impactCount: 0,
    };

    for (const hit of params.hits) {
      const result = this.combatResolver.resolveAttack(hit, [params.player]);
      if (result.hitCount > 0) {
        feedback.impactCount += result.hitCount;
        feedback.hitStopMs = Math.max(feedback.hitStopMs, hit.hitStopMs);
        feedback.cameraShakeMs = Math.max(feedback.cameraShakeMs, hit.cameraShakeMs ?? 0);
        feedback.cameraShakeIntensity = Math.max(
          feedback.cameraShakeIntensity,
          hit.cameraShakeIntensity ?? 0,
        );
      }
    }

    return {
      player: params.player,
      feedback,
    };
  }
}
