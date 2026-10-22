import { CombatResolver } from '@/game/core/combat/CombatResolver';
import type { ProjectileSystem } from '@/game/core/combat/ProjectileSystem';
import type { Player } from '@/game/core/characters/Player';
import type { Enemy } from '@/game/core/characters/Enemy';
import type { InputState } from '@/shared/types/game';

export class AbilitySystem {
  private readonly resolver = new CombatResolver();

  update(params: { player: Player; input: InputState; enemies: Enemy[]; projectiles: ProjectileSystem }) {
    const { player, input, projectiles } = params;
    if (input.fireboltPressed && player.cast('firebolt')) {
      const dx = input.aim.x - player.position.x, dy = input.aim.y - player.position.y;
      const length = Math.hypot(dx, dy);
      const direction = length > 0 ? { x: dx / length, y: dy / length } : player.facing;
      projectiles.spawn({
        sourceId: player.id, team: player.team, position: { ...player.position },
        velocity: { x: direction.x * 520, y: direction.y * 520 },
        radius: 9, damage: 90 * player.spellPower, ttlMs: 1300, color: 0xffad55,
      });
    }
    if (input.novaPressed && player.cast('nova')) {
      this.resolver.resolveAttack({
        sourceId: player.id, team: player.team, type: 'melee', damageType: 'magic',
        damage: 110 * player.spellPower, range: 0, radius: 145, direction: player.direction,
        origin: { ...player.position }, knockback: 160, hitStopMs: 35,
      }, params.enemies);
    }
  }
}
