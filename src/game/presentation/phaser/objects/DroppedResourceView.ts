import Phaser from 'phaser';
import { LOOT_TEXTURE_KEY } from '@/game/config/loot/lootTexture';
import { resourceDefinitions } from '@/game/config/loot/resourceDefinitions';
import type { DroppedResourceState } from '@/shared/types/game';

type DroppedResourceGraphics = {
  body: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
};

export class DroppedResourceView {
  private readonly items = new Map<string, DroppedResourceGraphics>();
  private readonly textureKey: string | null;

  constructor(private readonly scene: Phaser.Scene) {
    this.textureKey = this.scene.textures.exists(LOOT_TEXTURE_KEY) ? LOOT_TEXTURE_KEY : null;
  }

  render(resources: DroppedResourceState[]) {
    const aliveIds = new Set(resources.map((item) => item.id));

    for (const [id, graphics] of this.items.entries()) {
      if (!aliveIds.has(id)) {
        graphics.body.destroy();
        this.items.delete(id);
      }
    }

    for (const resource of resources) {
      let graphics = this.items.get(resource.id);

      if (!graphics) {
        graphics = {
          body: this.textureKey
            ? this.scene.add
                .sprite(resource.position.x, resource.position.y, this.textureKey)
                .setDisplaySize(22, 22)
                .setDepth(2)
            : this.scene.add
                .circle(resource.position.x, resource.position.y, 10, resourceDefinitions[resource.resourceType].color)
                .setStrokeStyle(2, 0x0f172a)
                .setDepth(2),
        };
        this.items.set(resource.id, graphics);
      }

      graphics.body.setPosition(resource.position.x, resource.position.y);
      const alpha = resource.pickupDelayMs > 0 ? 0.55 : 0.95;

      if (graphics.body instanceof Phaser.GameObjects.Sprite) {
        graphics.body
          .setDisplaySize(22, 22)
          .setTint(resourceDefinitions[resource.resourceType].color)
          .setAlpha(alpha);
      } else {
        graphics.body.setFillStyle(resourceDefinitions[resource.resourceType].color, alpha);
      }
    }
  }

  destroy() {
    for (const graphics of this.items.values()) {
      graphics.body.destroy();
    }
    this.items.clear();
  }
}
