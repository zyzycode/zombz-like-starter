/** Двумерный вектор (позиция или направление). */
export type Vector2 = {
  x: number;
  y: number;
};

export type CharacterState = 'idle' | 'walk' | 'attack' | 'cast' | 'hurt' | 'death';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type AnimationName = `${CharacterState}_${Direction}`;

export type AttackType = 'melee';

export type DamageType = 'physical';

export type TeamId = 'player' | 'enemy' | 'neutral';

export type AttackPhase = 'idle' | 'windup' | 'active' | 'recovery';

export type ResourceType = 'scrap' | 'ore' | 'essence';

export type ResourceNodeType = 'ore_vein' | 'scrap_pile' | 'bush';

export type TargetKind = 'player' | 'enemy' | 'destructible' | 'projectile' | 'aoe';

export type AttackConfig = {
  type: AttackType;
  damageType: DamageType;
  damage: number;
  range: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  cooldownMs: number;
  moveSpeedMultiplier: number;
  radius: number;
  knockback: number;
  hitStopMs: number;
  cameraShakeMs?: number;
  cameraShakeIntensity?: number;
};

export type AttackRuntimeState = {
  isActive: boolean;
  elapsedMs: number;
  cooldownRemainingMs: number;
  hasAppliedHit: boolean;
  direction: Direction;
  phase: AttackPhase;
};

export type AttackModifier = {
  damageMultiplier?: number;
  rangeBonus?: number;
  radiusBonus?: number;
};

export type AttackPayload = {
  sourceId: string;
  type: AttackType;
  damageType: DamageType;
  damage: number;
  range: number;
  radius: number;
  knockback: number;
  hitStopMs: number;
  cameraShakeMs?: number;
  cameraShakeIntensity?: number;
  direction: Direction;
  origin: Vector2;
  team: TeamId;
  modifiers?: AttackModifier[];
};

export type AttackOwner = {
  id: string;
  position: Vector2;
  direction: Direction;
  facing: Vector2;
  team: TeamId;
  attack: {
    config: AttackConfig;
    runtime: AttackRuntimeState;
  };
};

export type CombatTarget = {
  id: string;
  kind: TargetKind;
  position: Vector2;
  radius: number;
  hp: number;
  maxHp: number;
};

export type CharacterRuntime = {
  id: string;
  position: Vector2;
  speed: number;
  mass: number;
  hp: number;
  maxHp: number;
  radius: number;
  facing: Vector2;
  team: TeamId;
  attack: {
    config: AttackConfig;
    runtime: AttackRuntimeState;
  };
  hurtTimerMs: number;
  hurtDurationMs: number;
  hurtFlashTimerMs: number;
  hurtFlashDurationMs: number;
  knockbackVelocity: Vector2;
  state: CharacterState;
  direction: Direction;
};

/** Состояние игрока, которое полностью описывает его в мире. */
export type PlayerState = CharacterRuntime;

export type EnemyState = CharacterRuntime;

/** Состояние разрушаемого объекта на карте. */
export type DestructibleState = {
  id: string;
  position: Vector2;
  size: number;
  hp: number;
  maxHp: number;
};

export type DroppedResourceState = {
  id: string;
  resourceType: ResourceType;
  amount: number;
  position: Vector2;
  pickupRadius: number;
  pickupDelayMs: number;
  ttlMs: number | null;
};

export type ResourceNodeState = {
  id: string;
  nodeType: ResourceNodeType;
  position: Vector2;
  radius: number;
  hp: number;
  maxHp: number;
  lootTableId: string;
};

export type ExtractionZoneState = {
  id: string;
  position: Vector2;
  radius: number;
  channelDurationMs: number;
  isActive: boolean;
  progressMs: number;
};

/** Унифицированный ввод от клавиатуры и мыши. */
export type InputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attackPressed: boolean;
  attackHeld: boolean;
  interactPressed: boolean;
  aim: Vector2;
};
