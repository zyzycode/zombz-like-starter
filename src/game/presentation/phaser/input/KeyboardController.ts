import Phaser from 'phaser';
import type { InputState } from '@/shared/types/game';

/** Набор клавиш для движения и атаки. */
type MovementKeys = {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  SPACE: Phaser.Input.Keyboard.Key;
  E: Phaser.Input.Keyboard.Key;
};

/** Преобразует ввод с клавиатуры/мыши в единый InputState для игрового мира. */
export class KeyboardController {
  private readonly keys: MovementKeys;
  private pointerWorld = { x: 0, y: 0 };
  private wasAttackDown = false;
  private wasInteractDown = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.keys = this.scene.input.keyboard!.addKeys('W,A,S,D,SPACE,E') as MovementKeys;

    // Сохраняем мировые координаты указателя, чтобы корректно считать направление удара.
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
      this.pointerWorld = { x: worldPoint.x, y: worldPoint.y };
    });

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
      this.pointerWorld = { x: worldPoint.x, y: worldPoint.y };
    });
  }

  read(): InputState {
    const attackHeld = this.keys.SPACE.isDown || this.scene.input.activePointer.leftButtonDown();
    const attackPressed = attackHeld && !this.wasAttackDown;
    this.wasAttackDown = attackHeld;
    const interactHeld = this.keys.E.isDown;
    const interactPressed = interactHeld && !this.wasInteractDown;
    this.wasInteractDown = interactHeld;

    // Объединяем клавиатуру и мышь в один объект, независимый от Phaser API.
    return {
      up: this.keys.W.isDown,
      down: this.keys.S.isDown,
      left: this.keys.A.isDown,
      right: this.keys.D.isDown,
      attackPressed,
      attackHeld,
      interactPressed,
      aim: this.pointerWorld,
    };
  }
}
