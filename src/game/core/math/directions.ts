import type { Direction, Vector2 } from '@/shared/types/game';

/** Clockwise screen-plane octants; diagonals have the same length as cardinal vectors. */
export const DIRECTIONS: readonly Direction[] = [
  'right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right',
];

const diagonal = Math.SQRT1_2;
const vectors: Record<Direction, Vector2> = {
  up: { x: 0, y: -1 }, 'up-right': { x: diagonal, y: -diagonal },
  right: { x: 1, y: 0 }, 'down-right': { x: diagonal, y: diagonal },
  down: { x: 0, y: 1 }, 'down-left': { x: -diagonal, y: diagonal },
  left: { x: -1, y: 0 }, 'up-left': { x: -diagonal, y: -diagonal },
};

export function directionToVector(direction: Direction): Vector2 { return { ...vectors[direction] }; }

export function vectorToDirection(x: number, y: number): Direction | null {
  if ((!x && !y) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const octant = Math.round(Math.atan2(y, x) / (Math.PI / 4));
  return DIRECTIONS[(octant + DIRECTIONS.length) % DIRECTIONS.length];
}
