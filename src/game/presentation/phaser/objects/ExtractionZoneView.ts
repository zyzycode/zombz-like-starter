import Phaser from 'phaser';
import type { ExtractionZoneState } from '@/shared/types/game';

type ExtractionZoneGraphics = {
  ring: Phaser.GameObjects.Arc;
  core: Phaser.GameObjects.Arc;
};

export class ExtractionZoneView {
  private readonly items = new Map<string, ExtractionZoneGraphics>();

  constructor(private readonly scene: Phaser.Scene) {}

  render(zones: ExtractionZoneState[]) {
    const activeIds = new Set(zones.map((zone) => zone.id));

    for (const [id, graphics] of this.items.entries()) {
      if (!activeIds.has(id)) {
        graphics.ring.destroy();
        graphics.core.destroy();
        this.items.delete(id);
      }
    }

    for (const zone of zones) {
      let graphics = this.items.get(zone.id);

      if (!graphics) {
        const ring = this.scene.add
          .circle(zone.position.x, zone.position.y, zone.radius, 0x22d3ee, 0.08)
          .setStrokeStyle(3, 0x67e8f9, 0.8)
          .setDepth(1);
        const core = this.scene.add
          .circle(zone.position.x, zone.position.y, zone.radius * 0.32, 0x67e8f9, 0.22)
          .setDepth(1);
        graphics = { ring, core };
        this.items.set(zone.id, graphics);
      }

      const progressRatio = zone.channelDurationMs > 0 ? zone.progressMs / zone.channelDurationMs : 0;

      graphics.ring
        .setPosition(zone.position.x, zone.position.y)
        .setVisible(zone.isActive)
        .setStrokeStyle(3, progressRatio > 0 ? 0xfacc15 : 0x67e8f9, 0.8);
      graphics.core
        .setPosition(zone.position.x, zone.position.y)
        .setVisible(zone.isActive)
        .setFillStyle(progressRatio > 0 ? 0xfacc15 : 0x67e8f9, 0.16 + progressRatio * 0.28);
    }
  }

  destroy() {
    for (const graphics of this.items.values()) {
      graphics.ring.destroy();
      graphics.core.destroy();
    }
    this.items.clear();
  }
}
