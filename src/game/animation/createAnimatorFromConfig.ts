import { AnimationClip, type AnimationClipConfig } from '@/game/animation/AnimationClip';
import { Animator } from '@/game/animation/Animator';
import { SpriteSheet, type SpriteSheetConfig } from '@/game/animation/SpriteSheet';
import type Phaser from 'phaser';

export type AnimationLibraryConfig = {
  sheets: Record<string, SpriteSheetConfig>;
  clips: AnimationClipConfig[];
};

export function createAnimatorFromConfig(scene: Phaser.Scene, config: AnimationLibraryConfig) {
  const sheets = new Map<string, SpriteSheet>();

  for (const [sheetId, sheetConfig] of Object.entries(config.sheets)) {
    sheets.set(sheetId, new SpriteSheet(scene, sheetConfig));
  }

  const clips = config.clips.map((clipConfig) => {
    const sheet = sheets.get(clipConfig.sheetId);
    if (!sheet) {
      throw new Error(`SpriteSheet with id "${clipConfig.sheetId}" is not registered.`);
    }

    return new AnimationClip(clipConfig, sheet);
  });

  return new Animator(clips);
}

