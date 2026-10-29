import { CombatResolver } from '@/game/core/combat/CombatResolver';
import type { Damageable } from '@/game/core/contracts/GameplayContracts';
import type { ArenaHazardDefinition, ArenaHazardState } from '@/game/core/environment/ArenaHazard';

type HazardRuntime = { state: ArenaHazardState; attemptedTargets: Set<string> };

/** Level-local simulation clock freezes with the world, including hit-stop and pause. */
export class HazardSystem {
  private readonly hazards: HazardRuntime[];
  private readonly resolver = new CombatResolver();

  constructor(definitions: ArenaHazardDefinition[]) {
    this.hazards = definitions.map((definition) => ({
      state: { ...structuredClone(definition), phase: 'cooldown', phaseElapsedMs: 0, pulseIndex: 0 },
      attemptedTargets: new Set(),
    }));
  }

  getState(): ArenaHazardState[] { return structuredClone(this.hazards.map((hazard) => hazard.state)); }

  update(deltaMs: number, targets: Damageable[]) {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) return;
    for (const hazard of this.hazards) {
      // Catch a late entrant even when this step ends the current active phase.
      this.strike(hazard, targets);
      let remainingMs = deltaMs;
      while (true) {
        const state = hazard.state;
        const durationMs = state.phase === 'cooldown'
          ? state.pulseIndex === 0 ? Math.max(0, state.initialDelayMs) : Math.max(1, state.cooldownMs)
          : Math.max(1, state.phase === 'warning' ? state.warningMs : state.activeMs);
        const untilTransitionMs = durationMs - state.phaseElapsedMs;
        if (remainingMs < untilTransitionMs) {
          state.phaseElapsedMs += remainingMs;
          break;
        }
        remainingMs -= untilTransitionMs;
        state.phaseElapsedMs = 0;
        if (state.phase === 'cooldown') state.phase = 'warning';
        else if (state.phase === 'warning') {
          state.phase = 'active';
          state.pulseIndex += 1;
          hazard.attemptedTargets.clear();
          this.strike(hazard, targets);
        } else state.phase = 'cooldown';
      }
    }
  }

  private strike(hazard: HazardRuntime, targets: Damageable[]) {
    const state = hazard.state;
    if (state.phase !== 'active') return;
    const entering = targets.filter((target) => target.isAlive && !hazard.attemptedTargets.has(target.id)
      && Math.hypot(target.position.x - state.position.x, target.position.y - state.position.y) <= target.radius + state.radius);
    for (const target of entering) hazard.attemptedTargets.add(target.id);
    // An evaded strike still consumes this pulse's attempt, preserving dodge immunity.
    this.resolver.resolveAttack({
      sourceId: `hazard-${state.id}-${state.pulseIndex}`, team: 'neutral', type: 'melee',
      damageType: state.damageType, damage: state.damage, range: 0, radius: state.radius,
      origin: state.position, direction: 'down', knockback: 0, hitStopMs: 0,
    }, entering);
  }
}
