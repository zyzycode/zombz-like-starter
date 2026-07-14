import { AttackController } from '@/game/core/combat/AttackController';
import { Enemy } from '@/game/core/characters/Enemy';
import type { AttackPayload, PlayerState, Vector2 } from '@/shared/types/game';

/**
 * Обновляет AI врагов и собирает их атакующие payload-и.
 */
export class EnemyAiSystem {
  constructor(private readonly attackController = new AttackController()) {}

  update(params: {
    enemies: Enemy[];
    player: PlayerState;
    deltaMs: number;
    resolvePosition: (nextPosition: Vector2, radius: number) => Vector2;
  }) {
    const enemyHits: AttackPayload[] = [];

    for (const enemy of params.enemies) {
      const aiProfile = enemy.archetype.aiProfile;
      const chaseRange = enemy.archetype.aggroRange;
      const attackRangeBuffer = 'attackRangeBuffer' in aiProfile ? aiProfile.attackRangeBuffer : 0;

      enemy.update({
        player: params.player,
        deltaMs: params.deltaMs,
        chaseRange,
        attackDistance: this.getEnemyAttackDistance(enemy.toState(), params.player, attackRangeBuffer),
        attackController: this.attackController,
        onHit: (attack) => {
          enemyHits.push(attack);
        },
        resolvePosition: params.resolvePosition,
      });
    }

    return enemyHits;
  }

  private getEnemyAttackDistance(enemy: ReturnType<Enemy['toState']>, player: PlayerState, attackRangeBuffer: number) {
    return enemy.attack.config.range + enemy.attack.config.radius + player.radius + attackRangeBuffer;
  }
}
