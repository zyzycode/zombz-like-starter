import type { ExtractionZoneState, Vector2 } from '@/shared/types/game';

export class ExtractionZone {
  id: string;
  position: Vector2;
  radius: number;
  channelDurationMs: number;
  isActive: boolean;
  progressMs: number;

  constructor(state: ExtractionZoneState) {
    this.id = state.id;
    this.position = { ...state.position };
    this.radius = state.radius;
    this.channelDurationMs = state.channelDurationMs;
    this.isActive = state.isActive;
    this.progressMs = state.progressMs;
  }

  contains(position: Vector2, actorRadius: number) {
    if (!this.isActive) {
      return false;
    }

    const distance = Math.hypot(position.x - this.position.x, position.y - this.position.y);
    return distance <= this.radius + actorRadius;
  }

  advance(deltaMs: number) {
    this.progressMs = Math.min(this.channelDurationMs, this.progressMs + deltaMs);
  }

  decay(deltaMs: number) {
    this.progressMs = Math.max(0, this.progressMs - deltaMs);
  }

  reduceFromDamage(amountMs: number) {
    this.progressMs = Math.max(0, this.progressMs - amountMs);
  }

  get isComplete() {
    return this.progressMs >= this.channelDurationMs;
  }

  toState(): ExtractionZoneState {
    return {
      id: this.id,
      position: { ...this.position },
      radius: this.radius,
      channelDurationMs: this.channelDurationMs,
      isActive: this.isActive,
      progressMs: this.progressMs,
    };
  }
}
