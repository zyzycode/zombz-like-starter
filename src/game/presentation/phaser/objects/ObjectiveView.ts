import Phaser from 'phaser';
import type { ObeliskState } from '@/game/core/environment/Obelisk';
import type { PlayerState } from '@/shared/types/game';

type ObeliskView = {
  ring: Phaser.GameObjects.Arc;
  body: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
};

/** Displays required objectives; activation and arena completion belong to the world. */
export class ObjectiveView {
  private readonly items = new Map<string, ObeliskView>();

  constructor(private readonly scene: Phaser.Scene) {}

  render(obelisks: ObeliskState[], player: PlayerState, timeMs: number) {
    const ids = new Set(obelisks.map((obelisk) => obelisk.id));
    for (const [id, view] of this.items) {
      if (!ids.has(id)) { this.destroyItem(view); this.items.delete(id); }
    }
    for (const obelisk of obelisks) {
      let view = this.items.get(obelisk.id);
      if (!view) {
        const { x, y } = obelisk.position;
        const ring = this.scene.add.circle(x, y, 29, 0xf1ba60, 0.09).setDepth(3);
        const body = this.scene.add.sprite(x, y, 'flare-obelisk', 0)
          .setOrigin(0.5, 0.75).setDepth(100 + y);
        const label = this.scene.add.text(x, y + 34, '', {
          fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#ffe2aa',
          backgroundColor: '#211b10ee', padding: { x: 7, y: 5 }, align: 'center',
        }).setOrigin(0.5, 0).setDepth(2100);
        view = { ring, body, label };
        this.items.set(obelisk.id, view);
      }
      const nearby = Math.hypot(player.position.x - obelisk.position.x, player.position.y - obelisk.position.y) <= obelisk.radius + player.radius;
      const color = obelisk.activated ? 0x91dfa5 : 0xf1ba60;
      view.ring.setStrokeStyle(nearby ? 2 : 1, color, 0.85).setFillStyle(color, obelisk.activated ? 0.13 : 0.06);
      view.body.setTint(color).setFrame(obelisk.activated ? Math.floor(timeMs / 267) % 6 : 0);
      view.label.setColor(obelisk.activated ? '#b7efc5' : '#ffe2aa');
      view.label.setText(obelisk.activated ? '✓ Активирован' : nearby ? 'E · активировать\nЦель арены' : 'Обелиск · E');
    }
  }

  private destroyItem(view: ObeliskView) { view.ring.destroy(); view.body.destroy(); view.label.destroy(); }
  destroy() { for (const view of this.items.values()) this.destroyItem(view); this.items.clear(); }
}
