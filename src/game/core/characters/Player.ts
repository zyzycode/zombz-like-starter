import { ACTIVE_ABILITIES, ACTIVE_ABILITY_IDS, isActiveAbility } from '@/game/core/combat/activeAbilities';
import { Character } from '@/game/core/characters/Character';
import type { AttackController } from '@/game/core/combat/AttackController';
import type { ActiveAbilityId, BuildResourcePolicy, Stats } from '@/game/core/progression/types';
import type { StatusEffect, AbilityState, AttackPayload, DamageType, InputState, PlayerState, Vector2 } from '@/shared/types/game';

const SPELLS = {
  firebolt: { cooldownKey: 'fireboltCooldownMs', manaCost: 20, cooldownMs: 550 },
  nova: { cooldownKey: 'novaCooldownMs', manaCost: 40, cooldownMs: 4500 },
  shieldBash: { cooldownKey: 'shieldBashCooldownMs', manaCost: 25, cooldownMs: 6000 },
  ...ACTIVE_ABILITIES,
} as const;

/** Character simulation owns movement, damage defence and ability resources. */
export class Player extends Character {
  private abilities: AbilityState;
  private unlockedAbilities = new Set<ActiveAbilityId>();
  private manaRegen = 10;
  private armor = 0;
  spellPower = 1;
  private dodgeDirection: Vector2 = { x: 0, y: 1 };

  constructor(state: PlayerState) {
    super(state);
    this.abilities = state.abilities ? { ...state.abilities } : {
      whirlwindCooldownMs: 0, whirlwindPulse: 0,
      frostWaveCooldownMs: 0, frostWavePulse: 0, frostWaveDirection: state.direction,
      mendCooldownMs: 0, mendPulse: 0,
      mana: 100, maxMana: 100, fireboltCooldownMs: 0, novaCooldownMs: 0,
      shieldBashCooldownMs: 0, shieldBashPulse: 0, shieldBashDirection: state.direction,
      dodgeCooldownMs: 0, dodgeRemainingMs: 0, novaPulse: 0,
    };
  }

  applyBuild(stats: Stats, resourcePolicy: BuildResourcePolicy = 'preserve-deficit') {
    const wasAlive = this.isAlive;
    const missingHp = this.maxHp - this.hp;
    this.maxHp = stats.maxHp;
    // Equipment changes neither heal nor kill a living wearer when maximum HP drops.
    const nextHp = resourcePolicy === 'preserve-current' ? this.hp : stats.maxHp - missingHp;
    this.hp = wasAlive ? Math.max(0, Math.min(stats.maxHp, nextHp)) : 0;
    this.attack.config.damage = stats.damage;
    this.speed = stats.moveSpeed;
    this.abilities.maxMana = stats.maxMana;
    this.abilities.mana = Math.min(this.abilities.mana, stats.maxMana);
    this.manaRegen = stats.manaRegen;
    this.armor = stats.armor;
    this.spellPower = stats.spellPower;
  }

  setUnlockedAbilities(ids: readonly ActiveAbilityId[]) { this.unlockedAbilities = new Set(ids); }

  getAbilities(): AbilityState { return { ...this.abilities }; }

  restoreResources(healthFraction: number, manaFraction: number): boolean {
    if (!this.isAlive) return false;
    const hp = Math.min(this.maxHp, this.hp + this.maxHp * Math.max(0, healthFraction));
    const mana = Math.min(this.abilities.maxMana, this.abilities.mana + this.abilities.maxMana * Math.max(0, manaFraction));
    const restored = hp > this.hp || mana > this.abilities.mana;
    this.hp = hp;
    this.abilities.mana = mana;
    return restored;
  }

  cast(spell: keyof typeof SPELLS): boolean {
    if (!this.isAlive || this.stunRemainingMs > 0 || this.abilities.dodgeRemainingMs > 0) return false;
    if (isActiveAbility(spell) && !this.unlockedAbilities.has(spell)) return false;
    if (spell === 'mend' && this.hp >= this.maxHp) return false;
    const { cooldownKey: key, manaCost: cost, cooldownMs } = SPELLS[spell];
    if (this.abilities[key] > 0 || this.abilities.mana < cost) return false;
    this.abilities.mana -= cost;
    this.abilities[key] = cooldownMs;
    if (isActiveAbility(spell)) this.abilities[ACTIVE_ABILITIES[spell].pulseKey] += 1;
    if (spell === 'shieldBash') this.abilities.shieldBashPulse += 1;
    if (spell === 'nova') this.abilities.novaPulse += 1;
    return true;
  }

  update(params: {
    input: InputState;
    deltaMs: number;
    attackController: AttackController;
    onHit: (attack: AttackPayload) => void;
    resolvePosition: (nextPosition: Vector2, radius: number) => Vector2;
  }) {
    const { deltaMs, input } = params;
    const wasStunned = this.stunRemainingMs > 0;
    this.tickAbilities(deltaMs);
    this.updateCombatReaction(deltaMs, params.resolvePosition);
    if (!this.isAlive) { this.state = 'death'; return; }
    if (wasStunned) { this.state = 'hurt'; return; }

    const x = Number(input.right) - Number(input.left);
    const y = Number(input.down) - Number(input.up);
    const length = Math.hypot(x, y) || 1;
    const movement = { x: x / length, y: y / length };
    const isMoving = x !== 0 || y !== 0;
    if (input.dodgePressed && this.abilities.dodgeCooldownMs === 0) {
      params.attackController.cancel(this);
      this.abilities.dodgeCooldownMs = 1400;
      this.abilities.dodgeRemainingMs = 180;
      this.dodgeDirection = isMoving ? movement : { ...this.facing };
      if (isMoving) this.faceTowards(x, y);
      this.hurtTimerMs = 0;
      this.knockbackVelocity = { x: 0, y: 0 };
    }
    if (this.abilities.dodgeRemainingMs > 0) {
      this.move(this.dodgeDirection, Math.min(deltaMs, this.abilities.dodgeRemainingMs), 3, params.resolvePosition);
      this.state = 'walk';
      return;
    }
    if (this.hurtTimerMs > 0) { this.state = 'hurt'; return; }
    if (!this.attack.runtime.isActive) {
      const aimX = input.aim.x - this.position.x;
      const aimY = input.aim.y - this.position.y;
      const aiming = input.attackPressed || input.attackHeld || input.fireboltPressed || input.novaPressed || input.shieldBashPressed || input.whirlwindPressed || input.frostWavePressed;
      if (isMoving && !aiming) this.faceTowards(x, y);
      else if (aimX || aimY) this.faceTowards(aimX, aimY);
      else if (isMoving) this.faceTowards(x, y);
    }
    const attackUpdate = params.attackController.update(this, deltaMs, input.attackPressed || input.attackHeld);
    this.move(movement, deltaMs, attackUpdate.movementMultiplier, params.resolvePosition);
    if (attackUpdate.hit) params.onHit(attackUpdate.hit);
    this.state = attackUpdate.isAttacking ? 'attack' : isMoving ? 'walk' : 'idle';
  }

  moveInExploration(input: InputState, deltaMs: number, resolvePosition: (position: Vector2, radius: number) => Vector2) {
    if (!this.isAlive) return;
    const x = Number(input.right) - Number(input.left), y = Number(input.down) - Number(input.up);
    const length = Math.hypot(x, y) || 1;
    if (x || y) this.faceTowards(x, y);
    this.move({ x: x / length, y: y / length }, deltaMs, 1, resolvePosition);
    this.state = x || y ? 'walk' : 'idle';
  }

  setFrostWaveDirection(direction: PlayerState['direction']) { this.abilities.frostWaveDirection = direction; }

  setShieldBashDirection(direction: PlayerState['direction']) { this.abilities.shieldBashDirection = direction; }

  override applyStatus(effect: StatusEffect) {
    if (this.abilities.dodgeRemainingMs === 0) super.applyStatus(effect);
  }

  override applyDamage(amount: number, damageType: DamageType) {
    if (this.abilities.dodgeRemainingMs > 0 || !this.isAlive) return;
    super.applyDamage(Math.max(1, amount - this.armor), damageType);
  }

  override applyKnockback(impulse: Vector2) {
    if (this.abilities.dodgeRemainingMs === 0) super.applyKnockback(impulse);
  }

  applyResolvedState(state: PlayerState) {
    this.stunRemainingMs = state.stunRemainingMs ?? 0;
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.hurtTimerMs = state.hurtTimerMs;
    this.hurtFlashTimerMs = state.hurtFlashTimerMs;
    if (state.abilities) this.abilities = { ...state.abilities };
  }

  toState(): PlayerState { return { ...this.toRuntime(), abilities: this.getAbilities() }; }

  private tickAbilities(deltaMs: number) {
    this.abilities.mana = Math.min(this.abilities.maxMana, this.abilities.mana + this.manaRegen * deltaMs / 1000);
    for (const id of ACTIVE_ABILITY_IDS) {
      const key = ACTIVE_ABILITIES[id].cooldownKey;
      this.abilities[key] = Math.max(0, this.abilities[key] - deltaMs);
    }
    for (const key of ['shieldBashCooldownMs', 'fireboltCooldownMs', 'novaCooldownMs', 'dodgeCooldownMs', 'dodgeRemainingMs'] as const) {
      this.abilities[key] = Math.max(0, this.abilities[key] - deltaMs);
    }
  }
}
