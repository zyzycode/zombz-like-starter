import type { CollisionShapeDefinition } from '@/game/content/maps/types';

export class CollisionGrid {
  constructor(
    readonly worldWidth: number,
    readonly worldHeight: number,
    private readonly staticShapes: CollisionShapeDefinition[],
  ) {}

  getStaticShapes() {
    return this.staticShapes;
  }
}
