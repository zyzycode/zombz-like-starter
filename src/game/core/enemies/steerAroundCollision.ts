import type { Vector2 } from '@/shared/types/game';

export type CollisionSteeringMemory = { direction: Vector2; remainingMs: number };

/** Local probes route around small cover islands; this deliberately does not solve mazes. */
export function steerAroundCollision(params: {
  position: Vector2;
  intent: Vector2;
  radius: number;
  preferredSide: number;
  memory: CollisionSteeringMemory;
  deltaMs: number;
  resolvePosition: (position: Vector2, radius: number) => Vector2;
}): Vector2 {
  const { position, intent, radius, preferredSide, memory, deltaMs, resolvePosition } = params;
  if (intent.x === 0 && intent.y === 0) { memory.remainingMs = 0; return intent; }
  const lookAhead = Math.max(24, radius * 2);
  const clear = (direction: Vector2) => {
    for (let step = 1; step <= 3; step++) {
      const point = { x: position.x + direction.x * lookAhead * step / 3, y: position.y + direction.y * lookAhead * step / 3 };
      const resolved = resolvePosition(point, radius);
      if (Math.hypot(resolved.x - point.x, resolved.y - point.y) > .5) return false;
    }
    return true;
  };
  // Commit briefly to a chosen escape heading instead of switching sides between nearby props.
  if (memory.remainingMs > 0 && clear(memory.direction)) {
    memory.remainingMs = Math.max(0, memory.remainingMs - deltaMs);
    return memory.direction;
  }
  memory.remainingMs = 0;
  if (clear(intent)) return intent;
  // Try the entire preferred side before reversing the turn. Alternating +/- angles can
  // oscillate forever in the concave gaps between two individually small cover objects.
  for (const turn of [1, 2, 3, 4, -1, -2, -3]) {
    const angle = turn * preferredSide * Math.PI / 4;
    const candidate = {
      x: intent.x * Math.cos(angle) - intent.y * Math.sin(angle),
      y: intent.x * Math.sin(angle) + intent.y * Math.cos(angle),
    };
    if (clear(candidate)) {
      memory.direction = candidate;
      memory.remainingMs = 800;
      return candidate;
    }
  }
  return { x: 0, y: 0 };
}
