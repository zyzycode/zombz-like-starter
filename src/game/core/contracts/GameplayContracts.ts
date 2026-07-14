import type {
  AttackConfig,
  AttackModifier,
  AttackRuntimeState,
  DamageType,
  Direction,
  ResourceType,
  TeamId,
  Vector2,
} from '@/shared/types/game';
import type { RunSession } from '@/game/core/world/RunSession';

export type ActiveAttackRuntime = {
  sourceId: string;
  origin: Vector2;
  facing: Vector2;
  direction: Direction;
  team: TeamId;
  config: AttackConfig;
  runtime: AttackRuntimeState;
  modifiers?: AttackModifier[];
};

export interface Damageable {
  id: string;
  position: Vector2;
  radius: number;
  isAlive: boolean;
  team: TeamId;
  applyDamage: (amount: number, damageType: DamageType) => void;
  applyKnockback?: (impulse: Vector2) => void;
}

export interface AttackSource {
  id: string;
  position: Vector2;
  facing: Vector2;
  team: TeamId;
  getActiveAttackRuntime: () => ActiveAttackRuntime | null;
}

export type InteractionContext = {
  actorId: string;
  actorPosition: Vector2;
  actorRadius: number;
  runSession: RunSession;
};

export type InteractionResult = {
  extracted?: boolean;
  resourceType?: ResourceType;
  amount?: number;
};

export interface Interactable {
  id: string;
  position: Vector2;
  radius: number;
  canInteract: (context: InteractionContext) => boolean;
  interact: (context: InteractionContext) => InteractionResult | null;
}

export interface LootDropSource {
  getLootTableId: () => string | null;
}
