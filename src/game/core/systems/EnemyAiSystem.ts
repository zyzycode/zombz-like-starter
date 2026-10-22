import type { ProjectileSystem } from '@/game/core/combat/ProjectileSystem';
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
    projectiles?: ProjectileSystem;
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
        attackDistance: aiProfile.kind === 'ranged' ? aiProfile.preferredRange + 80 : this.getEnemyAttackDistance(enemy.toState(), params.player, attackRangeBuffer),
        attackController: this.attackController,
        onHit: (attack) => {
          if (aiProfile.kind === 'ranged' && params.projectiles) {
            this.shoot(enemy, params.player.position, params.projectiles);
          } else {
            enemyHits.push(attack);
            if (enemy.archetype.id === 'boss' && params.projectiles) {
              for (let i = 0; i < 8; i++) {
                const angle = i * Math.PI / 4;
                this.shoot(enemy, { x: enemy.position.x + Math.cos(angle), y: enemy.position.y + Math.sin(angle) }, params.projectiles, 170);
              }
            }
          }
        },
        resolvePosition: params.resolvePosition,
      });
    }

    return enemyHits;
  }

  private shoot(enemy: Enemy, target: Vector2, projectiles: ProjectileSystem, speed = 230) {
    const dx = target.x - enemy.position.x, dy = target.y - enemy.position.y;
    const length = Math.hypot(dx, dy) || 1;
    projectiles.spawn({
      sourceId: enemy.id, team: 'enemy', position: { ...enemy.position },
      velocity: { x: dx / length * speed, y: dy / length * speed },
      radius: 7, damage: enemy.attack.config.damage, ttlMs: 3000, color: 0xd687ff,
    });
  }

  private getEnemyAttackDistance(enemy: ReturnType<Enemy['toState']>, player: PlayerState, attackRangeBuffer: number) {
    return enemy.attack.config.range + enemy.attack.config.radius + player.radius + attackRangeBuffer;
  }
}
