import { Character } from '@/game/core/characters/Character';
import type { Vector2 } from '@/shared/types/game';

function getSeparationNormal(a: Character, b: Character) {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return {
      distance,
      nx: 1,
      ny: 0,
    };
  }

  return {
    distance,
    nx: dx / distance,
    ny: dy / distance,
  };
}

/**
 * Мягко раздвигает персонажей, если их радиусы пересекаются.
 * Работает поверх movement и не знает ничего про боёвку.
 */
export class SeparationSystem {
  separate(params: {
    units: Character[];
    resolvePosition: (nextPosition: Vector2, radius: number) => Vector2;
    iterations?: number;
  }) {
    const iterations = params.iterations ?? 2;

    for (let pass = 0; pass < iterations; pass += 1) {
      for (let i = 0; i < params.units.length; i += 1) {
        const a = params.units[i];
        if (!a.isAlive) {
          continue;
        }

        for (let j = i + 1; j < params.units.length; j += 1) {
          const b = params.units[j];
          if (!b.isAlive) {
            continue;
          }

          const minDistance = a.radius + b.radius;
          const { distance, nx, ny } = getSeparationNormal(a, b);

          if (distance >= minDistance) {
            continue;
          }

          const overlap = minDistance - distance;
          const totalMass = a.mass + b.mass;
          const aShare = totalMass > 0 ? b.mass / totalMass : 0.5;
          const bShare = totalMass > 0 ? a.mass / totalMass : 0.5;

          const nextAPosition = params.resolvePosition(
            {
              x: a.position.x - nx * overlap * aShare,
              y: a.position.y - ny * overlap * aShare,
            },
            a.radius,
          );
          const nextBPosition = params.resolvePosition(
            {
              x: b.position.x + nx * overlap * bShare,
              y: b.position.y + ny * overlap * bShare,
            },
            b.radius,
          );

          a.position.x = nextAPosition.x;
          a.position.y = nextAPosition.y;
          b.position.x = nextBPosition.x;
          b.position.y = nextBPosition.y;
        }
      }
    }
  }
}
