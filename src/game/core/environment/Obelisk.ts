import type { Vector2 } from '@/shared/types/game';

export type ObeliskDefinition = { id: string; position: Vector2; radius: number };
export type ObeliskState = ObeliskDefinition & { activated: boolean };
