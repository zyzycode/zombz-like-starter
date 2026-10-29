import Phaser from 'phaser';
import type { ExplorationCacheState } from '@/game/core/environment/ExplorationCache';
import type { PlayerState } from '@/shared/types/game';

type CacheGraphics = {
  body: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
};

/** Existing Flare chest artwork; opening and rewards belong to the simulation. */
export class CacheView {
  private readonly items = new Map<string, CacheGraphics>();
  constructor(private readonly scene: Phaser.Scene) {}

  render(caches: ExplorationCacheState[], player: PlayerState) {
    const ids = new Set(caches.map((cache) => cache.id));
    for (const [id, view] of this.items) {
      if (!ids.has(id)) { this.destroyItem(view); this.items.delete(id); }
    }
    for (const cache of caches) {
      let view = this.items.get(cache.id);
      if (!view) {
        const body = this.scene.add.sprite(cache.position.x, cache.position.y, 'flare-dungeon-props', 34)
          .setOrigin(.5, .875).setScale(1.3).setDepth(100 + cache.position.y);
        const label = this.scene.add.text(cache.position.x, cache.position.y + 18, '', {
          fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#f5dfad',
          backgroundColor: '#231c12ed', padding: { x: 7, y: 5 }, align: 'center',
        }).setOrigin(.5, 0).setDepth(2100);
        view = { body, label };
        this.items.set(cache.id, view);
      }
      const nearby = Math.hypot(player.position.x - cache.position.x, player.position.y - cache.position.y) <= cache.radius + player.radius;
      view.body.setFrame(cache.opened ? 41 : 34).setAlpha(cache.opened ? .7 : 1);
      view.label.setText(cache.opened ? 'Тайник открыт' : nearby && player.hp > 0 ? 'E · забрать предмет\nВ рюкзак' : 'Тайник · E')
        .setVisible(!cache.opened || nearby);
    }
  }

  private destroyItem(view: CacheGraphics) { view.body.destroy(); view.label.destroy(); }
  destroy() { for (const view of this.items.values()) this.destroyItem(view); this.items.clear(); }
}
