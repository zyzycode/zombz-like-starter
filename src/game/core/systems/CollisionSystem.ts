import { Destructible } from '@/game/core/objects/Destructible';
import { ResourceNode } from '@/game/core/objects/ResourceNode';
import type { CollisionShapeDefinition } from '@/game/content/maps/types';
import type { CollisionGrid } from '@/game/world/collision/CollisionGrid';
import type { Vector2 } from '@/shared/types/game';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Отвечает за простую world collision resolution персонажей с окружением.
 */
export class CollisionSystem {
  resolveCharacterCollision(params: {
    position: Vector2;
    radius: number;
    collisionGrid: CollisionGrid;
    destructibles: Destructible[];
    resourceNodes: ResourceNode[];
  }) {
    const resolved = { ...params.position };
    const staticShapes = params.collisionGrid.getStaticShapes();

    for (let pass = 0; pass < 2; pass += 1) {
      for (const obstacle of [...params.destructibles, ...params.resourceNodes]) {
        const dx = resolved.x - obstacle.position.x;
        const dy = resolved.y - obstacle.position.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = params.radius + obstacle.radius;

        if (distance >= minDistance) {
          continue;
        }

        if (distance === 0) {
          resolved.x += minDistance;
          continue;
        }

        const nx = dx / distance;
        const ny = dy / distance;
        const penetration = minDistance - distance;
        resolved.x += nx * penetration;
        resolved.y += ny * penetration;
      }

      for (const shape of staticShapes) {
        this.resolveStaticShapeCollision(resolved, params.radius, shape);
      }

      resolved.x = clamp(
        resolved.x,
        params.radius,
        params.collisionGrid.worldWidth - params.radius,
      );
      resolved.y = clamp(
        resolved.y,
        params.radius,
        params.collisionGrid.worldHeight - params.radius,
      );
    }

    return resolved;
  }

  private resolveStaticShapeCollision(position: Vector2, radius: number, shape: CollisionShapeDefinition) {
    if (shape.kind === 'circle') {
      const dx = position.x - shape.position.x;
      const dy = position.y - shape.position.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = radius + shape.radius;

      if (distance >= minDistance) {
        return;
      }

      if (distance === 0) {
        position.x += minDistance;
        return;
      }

      const nx = dx / distance;
      const ny = dy / distance;
      const penetration = minDistance - distance;
      position.x += nx * penetration;
      position.y += ny * penetration;
      return;
    }

    if (shape.kind === 'polygon') {
      const worldPoints = shape.points.map((point) => ({
        x: shape.position.x + point.x,
        y: shape.position.y + point.y,
      }));
      const bounds = getPolygonBounds(worldPoints);
      this.resolveStaticShapeCollision(position, radius, {
        id: shape.id,
        kind: 'rect',
        position: {
          x: bounds.minX + (bounds.maxX - bounds.minX) / 2,
          y: bounds.minY + (bounds.maxY - bounds.minY) / 2,
        },
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
      });
      return;
    }

    const halfWidth = shape.width / 2;
    const halfHeight = shape.height / 2;
    const closestX = clamp(position.x, shape.position.x - halfWidth, shape.position.x + halfWidth);
    const closestY = clamp(position.y, shape.position.y - halfHeight, shape.position.y + halfHeight);
    const dx = position.x - closestX;
    const dy = position.y - closestY;
    const distance = Math.hypot(dx, dy);

    if (distance >= radius) {
      return;
    }

    if (distance > 0) {
      const nx = dx / distance;
      const ny = dy / distance;
      const penetration = radius - distance;
      position.x += nx * penetration;
      position.y += ny * penetration;
      return;
    }

    const offsetX = position.x - shape.position.x;
    const offsetY = position.y - shape.position.y;
    const pushX = halfWidth + radius - Math.abs(offsetX);
    const pushY = halfHeight + radius - Math.abs(offsetY);

    if (pushX < pushY) {
      position.x += offsetX >= 0 ? pushX : -pushX;
      return;
    }

    position.y += offsetY >= 0 ? pushY : -pushY;
  }
}

function getPolygonBounds(points: Vector2[]) {
  let minX = points[0]?.x ?? 0;
  let maxX = points[0]?.x ?? 0;
  let minY = points[0]?.y ?? 0;
  let maxY = points[0]?.y ?? 0;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, maxX, minY, maxY };
}
