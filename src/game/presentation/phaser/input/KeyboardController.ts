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
  Q: Phaser.Input.Keyboard.Key;
  R: Phaser.Input.Keyboard.Key;
  F: Phaser.Input.Keyboard.Key;
  Z: Phaser.Input.Keyboard.Key;
  X: Phaser.Input.Keyboard.Key;
  C: Phaser.Input.Keyboard.Key;
  SHIFT: Phaser.Input.Keyboard.Key;
};

/** Преобразует ввод с клавиатуры/мыши в единый InputState для игрового мира. */
export class KeyboardController {
  private readonly keys: MovementKeys;
  private pointerWorld = { x: 0, y: 0 };
  private wasAttackDown = false;
  private wasInteractDown = false;
  private previousAbilities = { Q: false, R: false, F: false, Z: false, X: false, C: false, SHIFT: false };

  constructor(private readonly scene: Phaser.Scene) {
    this.keys = this.scene.input.keyboard!.addKeys('W,A,S,D,SPACE,E,Q,R,F,Z,X,C,SHIFT') as MovementKeys;

    this.scene.input.on('pointermove', this.updatePointer);
    this.scene.input.on('pointerdown', this.updatePointer);
  }

  private updatePointer = (pointer: Phaser.Input.Pointer) => {
    const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    this.pointerWorld = { x: worldPoint.x, y: worldPoint.y };
  };

  destroy() {
    this.scene.input.off('pointermove', this.updatePointer);
    this.scene.input.off('pointerdown', this.updatePointer);
    for (const key of Object.values(this.keys)) {
      this.scene.input.keyboard?.removeKey(key, true);
    }
  }

  read(): InputState {
    const attackHeld = this.keys.SPACE.isDown || this.scene.input.activePointer.leftButtonDown();
    const attackPressed = attackHeld && !this.wasAttackDown;
    this.wasAttackDown = attackHeld;
    const interactHeld = this.keys.E.isDown;
    const interactPressed = interactHeld && !this.wasInteractDown;
    this.wasInteractDown = interactHeld;

    this.updatePointer(this.scene.input.activePointer);
    const fireboltPressed = this.keys.Q.isDown && !this.previousAbilities.Q;
    const novaPressed = this.keys.R.isDown && !this.previousAbilities.R;
    const shieldBashPressed = this.keys.F.isDown && !this.previousAbilities.F;
    const slotZPressed = this.keys.Z.isDown && !this.previousAbilities.Z;
    const slotXPressed = this.keys.X.isDown && !this.previousAbilities.X;
    const slotCPressed = this.keys.C.isDown && !this.previousAbilities.C;
    const dodgePressed = this.keys.SHIFT.isDown && !this.previousAbilities.SHIFT;
    this.previousAbilities = { Q: this.keys.Q.isDown, R: this.keys.R.isDown, F: this.keys.F.isDown, Z: this.keys.Z.isDown, X: this.keys.X.isDown, C: this.keys.C.isDown, SHIFT: this.keys.SHIFT.isDown };

    // Объединяем клавиатуру и мышь в один объект, независимый от Phaser API.
    return {
      up: this.keys.W.isDown,
      down: this.keys.S.isDown,
      left: this.keys.A.isDown,
      right: this.keys.D.isDown,
      attackPressed,
      attackHeld,
      interactPressed,
      fireboltPressed,
      novaPressed,
      shieldBashPressed,
      slotZPressed,
      slotXPressed,
      slotCPressed,
      dodgePressed,
      aim: this.pointerWorld,
    };
  }
}
