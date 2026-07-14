import { AnimationClip } from '@/game/animation/AnimationClip';

/**
 * Управляет текущей анимацией, временем и активным кадром.
 * Ничего не знает о Player/Enemy.
 */
export class Animator {
  private readonly clips = new Map<string, AnimationClip>();
  private currentClip: AnimationClip | null = null;
  private frameIndex = 0;
  private frameTimerMs = 0;

  constructor(clips: AnimationClip[]) {
    for (const clip of clips) {
      this.clips.set(clip.name, clip);
    }

    this.currentClip = clips[0] ?? null;
  }

  has(name: string) {
    return this.clips.has(name);
  }

  play(name: string) {
    const clip = this.clips.get(name);
    if (!clip || clip === this.currentClip) {
      return;
    }

    this.currentClip = clip;
    this.frameIndex = 0;
    this.frameTimerMs = 0;
  }

  update(deltaMs: number) {
    if (!this.currentClip || this.currentClip.length <= 1 || this.currentClip.fps <= 0) {
      return;
    }

    const frameDurationMs = 1000 / this.currentClip.fps;
    this.frameTimerMs += deltaMs;

    while (this.frameTimerMs >= frameDurationMs) {
      this.frameTimerMs -= frameDurationMs;
      this.frameIndex += 1;

      if (this.frameIndex < this.currentClip.length) {
        continue;
      }

      this.frameIndex = this.currentClip.loop ? 0 : this.currentClip.length - 1;
      if (!this.currentClip.loop) {
        this.frameTimerMs = 0;
        break;
      }
    }
  }

  getCurrentFrame() {
    return this.currentClip?.getFrame(this.frameIndex) ?? null;
  }
}

