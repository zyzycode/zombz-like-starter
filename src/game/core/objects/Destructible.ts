import type {
  Damageable,
  Interactable,
  InteractionContext,
  InteractionResult,
  LootDropSource,
} from '@/game/core/contracts/GameplayContracts';
import type { DamageType, DestructibleState, Vector2 } from '@/shared/types/game';

/**
 * Базовый объект окружения, который можно ломать, а позже и интерактить/лутать.
 */
export class Destructible implements Damageable, Interactable, LootDropSource {
  id: string;
  position: Vector2;
  size: number;
  hp: number;
  maxHp: number;
  radius: number;
  lootTableId: string | null;
  readonly team = 'neutral' as const;

  constructor(state: DestructibleState) {
    this.id = state.id;
    this.position = { ...state.position };
    this.size = state.size;
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.radius = state.size / 2;
    this.lootTableId = 'crate_basic';
  }

  get isAlive() {
    return this.hp > 0;
  }

  applyDamage(amount: number, _damageType: DamageType) {
    this.hp = Math.max(0, this.hp - amount);
  }

  canInteract(_context: InteractionContext) {
    return false;
  }

  interact(_context: InteractionContext): InteractionResult | null {
    return null;
  }

  getLootTableId() {
    return this.lootTableId;
  }

  toState(): DestructibleState {
    return {
      id: this.id,
      position: { ...this.position },
      size: this.size,
      hp: this.hp,
      maxHp: this.maxHp,
    };
  }
}
