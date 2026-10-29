import Phaser from 'phaser';
import type { RestorationSiteState } from '@/game/core/environment/RestorationSite';
import type { PlayerState } from '@/shared/types/game';

type SiteView = {
  glow: Phaser.GameObjects.Arc;
  body: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
};

/** Displays supplies and proximity; only the simulation decides whether E consumes one. */
export class RestorationSiteView {
  private readonly items = new Map<string, SiteView>();

  constructor(private readonly scene: Phaser.Scene) {}

  render(sites: RestorationSiteState[], player: PlayerState, timeMs: number) {
    const ids = new Set(sites.map((site) => site.id));
    for (const [id, view] of this.items) {
      if (!ids.has(id)) { this.destroyItem(view); this.items.delete(id); }
    }
    for (const site of sites) {
      let view = this.items.get(site.id);
      if (!view) {
        const glow = this.scene.add.circle(site.position.x, site.position.y, 26, 0x79f1dc, 0.12).setDepth(3);
        const body = this.scene.add.sprite(site.position.x, site.position.y, 'flare-obelisk', 0)
          .setOrigin(0.5, 0.75).setDepth(100 + site.position.y);
        const label = this.scene.add.text(site.position.x, site.position.y + 34, '', {
          fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#d9fff4',
          backgroundColor: '#0b201dec', padding: { x: 7, y: 5 }, align: 'center',
        }).setOrigin(0.5, 0).setDepth(2100);
        view = { glow, body, label };
        this.items.set(site.id, view);
      }
      const nearby = Math.hypot(player.position.x - site.position.x, player.position.y - site.position.y) <= site.radius + player.radius;
      const full = player.hp >= player.maxHp && (!player.abilities || player.abilities.mana >= player.abilities.maxMana);
      view.glow.setAlpha(site.used ? 0 : 0.65 + Math.sin(timeMs / 400) * 0.25);
      view.body.setTint(site.used ? 0x687979 : 0xffffff).setAlpha(site.used ? 0.55 : 1);
      view.body.setFrame(site.used ? 0 : Math.floor(timeMs / 267) % 6);
      view.label.setText(site.used ? 'Источник иссяк' : nearby
        ? full ? 'Здоровье и мана полны' : `E · восстановить\n+${Math.round(site.healthFraction * 100)}% здоровья · +${Math.round(site.manaFraction * 100)}% маны`
        : 'Источник · E');
      view.label.setVisible(!site.used || nearby);
    }
  }

  private destroyItem(view: SiteView) { view.glow.destroy(); view.body.destroy(); view.label.destroy(); }
  destroy() { for (const view of this.items.values()) this.destroyItem(view); this.items.clear(); }
}
