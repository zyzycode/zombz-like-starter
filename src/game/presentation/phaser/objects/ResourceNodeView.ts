import Phaser from 'phaser';
import type { ResourceNodeState } from '@/shared/types/game';

type ResourceNodeGraphics = {
  body: Phaser.GameObjects.Ellipse;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
};

const nodeColors = {
  ore_vein: 0xf59e0b,
  scrap_pile: 0x94a3b8,
  bush: 0x22c55e,
} as const;

export class ResourceNodeView {
  private readonly items = new Map<string, ResourceNodeGraphics>();

  constructor(private readonly scene: Phaser.Scene) {}

  render(nodes: ResourceNodeState[]) {
    const aliveIds = new Set(nodes.map((node) => node.id));

    for (const [id, graphics] of this.items.entries()) {
      if (!aliveIds.has(id)) {
        graphics.body.destroy();
        graphics.hpBarBg.destroy();
        graphics.hpBar.destroy();
        this.items.delete(id);
      }
    }

    for (const node of nodes) {
      let graphics = this.items.get(node.id);

      if (!graphics) {
        const body = this.scene.add
          .ellipse(node.position.x, node.position.y, node.radius * 2.1, node.radius * 1.7, nodeColors[node.nodeType])
          .setStrokeStyle(2, 0x0f172a)
          .setDepth(3);
        const hpBarBg = this.scene.add.rectangle(node.position.x, node.position.y - node.radius - 10, 32, 6, 0x111827).setDepth(4);
        const hpBar = this.scene.add
          .rectangle(node.position.x - 16, node.position.y - node.radius - 10, 32, 4, 0x22c55e)
          .setOrigin(0, 0.5)
          .setDepth(5);
        graphics = { body, hpBarBg, hpBar };
        this.items.set(node.id, graphics);
      }

      graphics.body.setPosition(node.position.x, node.position.y);
      graphics.body.setSize(node.radius * 2.1, node.radius * 1.7);
      const hpRatio = Phaser.Math.Clamp(node.hp / node.maxHp, 0, 1);
      graphics.hpBarBg.setPosition(node.position.x, node.position.y - node.radius - 10).setVisible(hpRatio < 1);
      graphics.hpBar.setPosition(node.position.x - 16, node.position.y - node.radius - 10).setSize(32 * hpRatio, 4);
      graphics.hpBar.setVisible(hpRatio < 1);
    }
  }

  destroy() {
    for (const graphics of this.items.values()) {
      graphics.body.destroy();
      graphics.hpBarBg.destroy();
      graphics.hpBar.destroy();
    }
    this.items.clear();
  }
}
