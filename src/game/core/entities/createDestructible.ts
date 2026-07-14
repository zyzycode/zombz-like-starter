import { Destructible } from '@/game/core/objects/Destructible';
import type { DestructibleState } from '@/shared/types/game';

/** Создаёт статичный разрушаемый объект (например, ящик). */
export function createDestructible(
  id: string,
  x: number,
  y: number,
  size = 40,
  hp = 100,
){
  return new Destructible({
    id,
    position: { x, y },
    size,
    hp,
    maxHp: hp,
  } satisfies DestructibleState);
}
