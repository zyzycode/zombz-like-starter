import type { SpriteSheet, SpriteSheetFrame } from '@/game/animation/SpriteSheet';

export type AnimationFramePoint = {
  row: number;
  column: number;
};

export type AnimationClipConfig = {
  name: string;
  sheetId: string;
  fps: number;
  loop: boolean;
  frames: AnimationFramePoint[];
};

/** Данные одной анимации. */
export class AnimationClip {
  readonly name: string;
  readonly fps: number;
  readonly loop: boolean;
  readonly sheetId: string;
  readonly frames: SpriteSheetFrame[];

  constructor(config: AnimationClipConfig, sheet: SpriteSheet) {
    this.name = config.name;
    this.fps = config.fps;
    this.loop = config.loop;
    this.sheetId = config.sheetId;
    this.frames = config.frames.map((frame) => sheet.getFrame(frame.row, frame.column));
  }

  getFrame(frameIndex: number) {
    return this.frames[frameIndex] ?? this.frames[0];
  }

  get length() {
    return this.frames.length;
  }
}

