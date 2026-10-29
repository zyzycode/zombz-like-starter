import { vectorToDirection } from '@/game/core/math/directions';
import { CombatResolver } from '@/game/core/combat/CombatResolver';
import type { ProjectileSystem } from '@/game/core/combat/ProjectileSystem';
import type { Player } from '@/game/core/characters/Player';
import type { Enemy } from '@/game/core/characters/Enemy';
import type { InputState } from '@/shared/types/game';

export class AbilitySystem {
  private readonly resolver = new CombatResolver();

  update(params: { player: Player; input: InputState; enemies: Enemy[]; projectiles: ProjectileSystem }) {
    const { player, input, projectiles } = params;
    if (input.whirlwindPressed && player.cast('whirlwind')) {
      this.resolver.resolveAttack({
        sourceId: player.id, team: player.team, type: 'melee', damageType: 'physical',
        damage: player.attack.config.damage * 1.5, range: 0, radius: 125,
        direction: player.direction, origin: { ...player.position }, knockback: 0, hitStopMs: 0,
      }, params.enemies);
    }
    if (input.frostWavePressed && player.cast('frostWave')) {
      const direction = vectorToDirection(input.aim.x - player.position.x, input.aim.y - player.position.y) ?? player.direction;
      player.setFrostWaveDirection(direction);
      this.resolver.resolveAttack({
        sourceId: player.id, team: player.team, type: 'melee', damageType: 'magic',
        damage: 40 * player.spellPower, range: 0, radius: 200, arcDegrees: 90,
        direction, origin: { ...player.position }, knockback: 0, hitStopMs: 0,
        statusEffects: [{ kind: 'stun', durationMs: Math.round(800 * (1 + player.stunDurationBonus)) }],
      }, params.enemies);
    }
    if (input.mendPressed && player.cast('mend')) player.restoreResources(0.35, 0);
    if (input.shieldBashPressed && player.cast('shieldBash')) {
      const direction = vectorToDirection(input.aim.x - player.position.x, input.aim.y - player.position.y) ?? player.direction;
      player.setShieldBashDirection(direction);
      this.resolver.resolveAttack({
        sourceId: player.id, team: player.team, type: 'melee', damageType: 'physical',
        damage: player.attack.config.damage * 0.6, range: 0, radius: 110, arcDegrees: 120,
        direction, origin: { ...player.position }, knockback: 0, hitStopMs: 0,
        statusEffects: [{ kind: 'stun', durationMs: Math.round(1400 * (1 + player.stunDurationBonus)) }],
      }, params.enemies);
    }
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
