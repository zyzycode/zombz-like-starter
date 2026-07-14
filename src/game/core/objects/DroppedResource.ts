import type { DroppedResourceState, ResourceType, Vector2 } from '@/shared/types/game';

export class DroppedResource {
  id: string;
  resourceType: ResourceType;
  amount: number;
  position: Vector2;
  pickupRadius: number;
  pickupDelayMs: number;
  ttlMs: number | null;

  constructor(state: DroppedResourceState) {
    this.id = state.id;
    this.resourceType = state.resourceType;
    this.amount = state.amount;
    this.position = { ...state.position };
    this.pickupRadius = state.pickupRadius;
    this.pickupDelayMs = state.pickupDelayMs;
    this.ttlMs = state.ttlMs;
  }

  tick(deltaMs: number) {
    this.pickupDelayMs = Math.max(0, this.pickupDelayMs - deltaMs);

    if (this.ttlMs === null) {
      return;
    }

    this.ttlMs = Math.max(0, this.ttlMs - deltaMs);
  }

  get isExpired() {
    return this.ttlMs !== null && this.ttlMs <= 0;
  }

  canPickup(position: Vector2, radius: number) {
    if (this.pickupDelayMs > 0) {
      return false;
    }

    const distance = Math.hypot(position.x - this.position.x, position.y - this.position.y);
    return distance <= this.pickupRadius + radius;
  }

  toState(): DroppedResourceState {
    return {
      id: this.id,
      resourceType: this.resourceType,
      amount: this.amount,
      position: { ...this.position },
      pickupRadius: this.pickupRadius,
      pickupDelayMs: this.pickupDelayMs,
      ttlMs: this.ttlMs,
    };
  }
}
