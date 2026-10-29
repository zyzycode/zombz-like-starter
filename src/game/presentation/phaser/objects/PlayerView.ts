import Phaser from 'phaser';
import { buildAnimationName } from '@/game/animation/animationNames';
import { createAnimatorFromConfig } from '@/game/animation/createAnimatorFromConfig';
import { heroAppearance, flareAttackFrame } from '@/game/config/characterAnimations';
import { drawAttackShape } from '@/game/presentation/phaser/renderer/drawAttackShape';
import type { PlayerState } from '@/shared/types/game';

/** Flare equipment is baked per direction with a common foot anchor. */
export class PlayerView {
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly attackArea: Phaser.GameObjects.Graphics;
  private readonly animator: ReturnType<typeof createAnimatorFromConfig>;

  constructor(scene: Phaser.Scene) {
    this.animator = createAnimatorFromConfig(scene, heroAppearance.library);
    this.shadow = scene.add.ellipse(0, 0, 30, 14, 0x080b0c, .4).setDepth(3);
    this.body = scene.add.sprite(0, 0, heroAppearance.initialTexture, 0)
      .setOrigin(heroAppearance.feetOrigin.x, heroAppearance.feetOrigin.y);
    this.attackArea = scene.add.graphics().setDepth(7);
  }

  render(player: PlayerState, deltaMs: number) {
    this.body.setPosition(player.position.x, player.position.y).setDepth(100 + player.position.y);
    this.shadow.setPosition(player.position.x, player.position.y + 2);
    this.animator.play(buildAnimationName(player.state, player.direction));
    this.animator.update(deltaMs);
    const frame = player.state === 'attack' && player.attack.runtime.isActive
      ? flareAttackFrame(heroAppearance, player.attack) : this.animator.getCurrentFrame();
    if (frame) this.body.setTexture(frame.textureKey, frame.frameIndex);
    const dodging = (player.abilities?.dodgeRemainingMs ?? 0) > 0;
    this.body.setTint(dodging ? 0x9cfff4 : player.hurtFlashTimerMs > 0 ? 0xffd4d4 : 0xffffff).setAlpha(dodging ? .65 : 1);
    this.attackArea.clear();
    if (player.attack.runtime.isActive) {
      drawAttackShape(this.attackArea, player.position, player.attack.runtime.direction, player.attack.config,
        0xefcc89, player.attack.runtime.phase === 'active' ? .23 : .06);
    }
  }

  destroy() { this.body.destroy(); this.shadow.destroy(); this.attackArea.destroy(); }
}
