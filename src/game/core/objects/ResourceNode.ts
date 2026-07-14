import type {
  Damageable,
  Interactable,
  InteractionContext,
  InteractionResult,
  LootDropSource,
} from '@/game/core/contracts/GameplayContracts';
import type { DamageType, ResourceNodeState, ResourceNodeType, Vector2 } from '@/shared/types/game';

export class ResourceNode implements Damageable, Interactable, LootDropSource {
  id: string;
  nodeType: ResourceNodeType;
  position: Vector2;
  radius: number;
  hp: number;
  maxHp: number;
  lootTableId: string;
  readonly team = 'neutral' as const;

  constructor(state: ResourceNodeState) {
    this.id = state.id;
    this.nodeType = state.nodeType;
    this.position = { ...state.position };
    this.radius = state.radius;
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.lootTableId = state.lootTableId;
  }

  get isAlive() {
    return this.hp > 0;
  }

  applyDamage(amount: number, _damageType: DamageType) {
    this.hp = Math.max(0, this.hp - amount);
  }

  canInteract(_context: InteractionContext) {
    return this.isAlive;
  }

  interact(_context: InteractionContext): InteractionResult | null {
    // Пока заглушка: на старте добыча идёт через урон, но объект уже встроен в общую interaction-систему.
    return null;
  }

  getLootTableId() {
    return this.lootTableId;
  }

  toState(): ResourceNodeState {
    return {
      id: this.id,
      nodeType: this.nodeType,
      position: { ...this.position },
      radius: this.radius,
      hp: this.hp,
      maxHp: this.maxHp,
      lootTableId: this.lootTableId,
    };
  }
}
