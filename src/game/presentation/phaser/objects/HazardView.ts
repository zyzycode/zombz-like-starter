import Phaser from 'phaser';
import type { ArenaHazardState } from '@/game/core/environment/ArenaHazard';

/** Draws only the simulation phase, so paused warnings never advance visually. */
export class HazardView {
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly sparks: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.ground = scene.add.graphics().setDepth(4);
    this.sparks = scene.add.graphics().setDepth(1790);
  }

  render(hazards: ArenaHazardState[]) {
    this.ground.clear();
    this.sparks.clear();
    for (const hazard of hazards) {
      const { x, y } = hazard.position;
      const { radius, phase, phaseElapsedMs } = hazard;
      const color = phase === 'warning' ? 0xffda69 : hazard.theme === 'frost' ? 0x9defff : 0xff754a;
      const g = this.ground;
      g.fillStyle(0x16212c, .55).fillCircle(x, y, radius);
      g.lineStyle(2, phase === 'cooldown' ? 0x8b9ba1 : color, phase === 'cooldown' ? .5 : 1);
      g.strokeCircle(x, y, radius);
      // Permanent runic markings identify the trap even while it is safe to cross.
      for (let index = 0; index < 6; index++) {
        const angle = index * Math.PI / 3;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        g.lineBetween(x + dx * (radius - 12), y + dy * (radius - 12), x + dx * (radius - 5), y + dy * (radius - 5));
      }
      g.strokeTriangle(x, y - 13, x - 12, y + 9, x + 12, y + 9);
      if (phase === 'warning') {
        const progress = Math.min(1, phaseElapsedMs / hazard.warningMs);
        g.fillStyle(color, .12 + progress * .22).fillCircle(x, y, radius);
        g.lineStyle(4, 0xfff1b0, 1);
        g.beginPath();
        g.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        g.strokePath();
        // A rising marker and filling rim distinguish warning from active without color alone.
        g.lineStyle(3, 0xffffff, .9).lineBetween(x, y - 8, x, y + 1);
        g.fillStyle(0xffffff, .9).fillCircle(x, y + 6, 2);
      } else if (phase === 'active') {
        const progress = Math.min(1, phaseElapsedMs / hazard.activeMs);
        g.fillStyle(color, .52).fillCircle(x, y, radius);
        const air = this.sparks;
        for (let index = 0; index < 5; index++) {
          const angle = index * Math.PI * .4 + hazard.pulseIndex;
          const px = x + Math.cos(angle) * radius * .55;
          const py = y + Math.sin(angle) * radius * .55;
          const height = (1 - progress) * 26 + 8;
          air.fillStyle(color, .85).fillTriangle(px - 6, py + 3, px + 6, py + 3, px, py - height);
          air.fillStyle(0xffffff, .9).fillCircle(px, py - height, 2);
        }
      }
    }
  }

  destroy() { this.ground.destroy(); this.sparks.destroy(); }
}
