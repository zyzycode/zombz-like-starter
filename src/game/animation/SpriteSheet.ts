import Phaser from 'phaser';

export type SpriteSheetConfig = {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
};

export type SpriteSheetFrame = {
  textureKey: string;
  frameIndex: number;
};

/**
 * Низкоуровневый адаптер над Phaser spritesheet.
 * Ничего не знает о состояниях персонажа или логике игры.
 */
export class SpriteSheet {
  readonly key: string;
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;

  constructor(private readonly scene: Phaser.Scene, config: SpriteSheetConfig) {
    this.key = config.key;
    this.path = config.path;
    this.frameWidth = config.frameWidth;
    this.frameHeight = config.frameHeight;
  }

  getColumns() {
    const texture = this.scene.textures.get(this.key);
    const source = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    return Math.floor(source.width / this.frameWidth);
  }

  getFrame(row: number, column: number): SpriteSheetFrame {
    return {
      textureKey: this.key,
      frameIndex: row * this.getColumns() + column,
    };
  }
}

