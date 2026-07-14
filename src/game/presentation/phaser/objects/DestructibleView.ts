import Phaser from 'phaser';
import {
  DESTRUCTIBLE_TEXTURE_ALT_KEY,
  DESTRUCTIBLE_TEXTURE_KEY,
} from '@/game/config/playerTexture';
import type { DestructibleState } from '@/shared/types/game';

type DestructibleGraphics = {
  body: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
};

/** Рендерит разрушаемые объекты и синхронизирует их полоски здоровья. */
export class DestructibleView {
  private readonly items = new Map<string, DestructibleGraphics>();
  private readonly textureKey: string | null;

  constructor(private readonly scene: Phaser.Scene) {
    this.textureKey = this.resolveTextureKey();
  }

  /** Выбирает доступную текстуру объекта: сначала основной ключ, потом запасной. */
  private resolveTextureKey() {
    if (this.scene.textures.exists(DESTRUCTIBLE_TEXTURE_KEY)) {
      return DESTRUCTIBLE_TEXTURE_KEY;
    }
    if (this.scene.textures.exists(DESTRUCTIBLE_TEXTURE_ALT_KEY)) {
      return DESTRUCTIBLE_TEXTURE_ALT_KEY;
    }
    return null;
  }

  /** Создаёт недостающие объекты, обновляет существующие и удаляет исчезнувшие. */
  render(destructibles: DestructibleState[]) {
    const aliveIds = new Set(destructibles.map((item) => item.id));

    for (const [id, graphics] of this.items.entries()) {
      if (!aliveIds.has(id)) {
        graphics.body.destroy();
        graphics.hpBarBg.destroy();
        graphics.hpBar.destroy();
        this.items.delete(id);
      }
    }

    for (const item of destructibles) {
      let graphics = this.items.get(item.id);

      if (!graphics) {
        // Если PNG не найдена, рисуем простой прямоугольник.
        const body = this.textureKey
          ? this.scene.add
              .sprite(item.position.x, item.position.y, this.textureKey)
              .setDisplaySize(item.size, item.size)
              .setDepth(4)
          : this.scene.add
              .rectangle(item.position.x, item.position.y, item.size, item.size, 0x8b5a2b)
              .setStrokeStyle(2, 0x3f2a14)
              .setDepth(4);

        const hpBarBg = this.scene.add
          .rectangle(item.position.x, item.position.y - item.size * 0.65, item.size, 6, 0x111827)
          .setDepth(5);

        const hpBar = this.scene.add
          .rectangle(item.position.x - item.size / 2, item.position.y - item.size * 0.65, item.size, 4, 0x22c55e)
          .setOrigin(0, 0.5)
          .setDepth(6);

        graphics = { body, hpBarBg, hpBar };
        this.items.set(item.id, graphics);
      }

      graphics.body.setPosition(item.position.x, item.position.y);
      graphics.body.setDisplaySize(item.size, item.size);
      if (graphics.body instanceof Phaser.GameObjects.Rectangle) {
        graphics.body.setSize(item.size, item.size);
      }

      const hpRatio = Phaser.Math.Clamp(item.hp / item.maxHp, 0, 1);
      graphics.hpBarBg.setPosition(item.position.x, item.position.y - item.size * 0.65).setSize(item.size, 6);
      graphics.hpBar.setPosition(item.position.x - item.size / 2, item.position.y - item.size * 0.65);
      graphics.hpBar.setSize(item.size * hpRatio, 4);
      graphics.hpBar.setVisible(hpRatio < 1);
      graphics.hpBarBg.setVisible(hpRatio < 1);
    }
  }

  /** Полностью очищает созданные Phaser-объекты. */
  destroy() {
    for (const graphics of this.items.values()) {
      graphics.body.destroy();
      graphics.hpBarBg.destroy();
      graphics.hpBar.destroy();
    }
    this.items.clear();
  }
}
