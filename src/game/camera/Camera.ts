import type { Vector2 } from '@/shared/types/game';

export type CameraTarget = {
  position: Vector2;
};

export type CameraBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type CameraOptions = {
  followLerp?: number;
  zoom?: number;
  bounds?: CameraBounds | null;
};

/**
 * Логическая камера мира.
 * Не знает ничего про Phaser, спрайты или рендер.
 */
export class Camera {
  x: number;
  y: number;
  width: number;
  height: number;
  readonly zoom: number;

  private target: CameraTarget | null = null;
  private readonly followLerp: number;
  private bounds: CameraBounds | null;

  constructor(params: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    options?: CameraOptions;
  }) {
    this.x = params.x ?? 0;
    this.y = params.y ?? 0;
    this.width = params.width;
    this.height = params.height;
    this.zoom = params.options?.zoom ?? 1;
    this.followLerp = params.options?.followLerp ?? 1;
    this.bounds = params.options?.bounds ?? null;
  }

  setTarget(target: CameraTarget | null) {
    this.target = target;
  }

  getTarget() {
    return this.target;
  }

  setViewportSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.clampToBounds();
  }

  setBounds(bounds: CameraBounds | null) {
    this.bounds = bounds;
    this.clampToBounds();
  }

  getBounds() {
    return this.bounds;
  }

  update() {
    if (!this.target) {
      return;
    }

    const nextX = this.target.position.x;
    const nextY = this.target.position.y;

    this.x += (nextX - this.x) * this.followLerp;
    this.y += (nextY - this.y) * this.followLerp;
    this.clampToBounds();
  }

  worldToScreen(point: Vector2) {
    return {
      x: (point.x - this.x) * this.zoom + this.width / 2,
      y: (point.y - this.y) * this.zoom + this.height / 2,
    };
  }

  screenToWorld(point: Vector2) {
    return {
      x: (point.x - this.width / 2) / this.zoom + this.x,
      y: (point.y - this.height / 2) / this.zoom + this.y,
    };
  }

  private clampToBounds() {
    if (!this.bounds) {
      return;
    }

    const halfWidth = Math.min(this.width / this.zoom / 2, (this.bounds.maxX - this.bounds.minX) / 2);
    const halfHeight = Math.min(this.height / this.zoom / 2, (this.bounds.maxY - this.bounds.minY) / 2);

    this.x = Math.max(this.bounds.minX + halfWidth, Math.min(this.x, this.bounds.maxX - halfWidth));
    this.y = Math.max(this.bounds.minY + halfHeight, Math.min(this.y, this.bounds.maxY - halfHeight));
  }
}

