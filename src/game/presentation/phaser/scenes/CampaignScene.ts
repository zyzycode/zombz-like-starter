import Phaser from 'phaser';
import { Camera } from '@/game/camera/Camera';
import { MetaProgression } from '@/game/core/meta/MetaProgression';
import { LocalMetaProfileRepository } from '@/game/session/LocalMetaProfileRepository';
import { RunController } from '@/game/session/RunController';
import { KeyboardController } from '@/game/presentation/phaser/input/KeyboardController';
import { WorldRenderer } from '@/game/presentation/phaser/renderer/WorldRenderer';
import { loadMapAssetsForScene } from '@/game/presentation/phaser/loading/loadMapAssetsForScene';
import { useHudStore } from '@/ui/hud/useHudStore';
import type { GameWorld } from '@/game/core/world/GameWorld';

/** Phaser owns only input, assets and rendering; the controller owns all run decisions. */
export class CampaignScene extends Phaser.Scene {
  private run: RunController | null = null;
  private inputController: KeyboardController | null = null;
  private worldRenderer: WorldRenderer | null = null;
  private renderedWorld: GameWorld | null = null;
  private pendingWorld: GameWorld | null = null;
  private cameraModel: Camera | null = null;
  private loadController: AbortController | null = null;
  private lastShake = 0;
  private hudElapsed = 0;

  constructor() { super('campaign'); }

  create() {
    this.run = new RunController(new MetaProgression(new LocalMetaProfileRepository()));
    this.inputController = new KeyboardController(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.input.keyboard?.on('keydown-ESC', this.pause);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
    const run = this.run;
    const act = (command: () => void | Promise<void>) => {
      const result = command();
      this.publish();
      if (result) void result.then(() => this.publish());
    };
    useHudStore.getState().setActions({
      startRun: () => act(() => run.startRun()),
      exploreArena: () => act(() => run.exploreArena()),
      finishExploration: () => act(() => run.finishExploration()),
      chooseReward: (id) => act(() => run.chooseReward(id)),
      selectRoute: (id) => act(() => run.selectRoute(id)),
      assignAbility: (slot, id) => act(() => run.assignAbility(slot, id)),
      unequip: (slot) => act(() => run.unequip(slot)),
      equip: (id) => act(() => run.equip(id)), learn: (id) => act(() => run.learn(id)),
      buyMetaUpgrade: (id) => act(() => run.buyMetaUpgrade(id)),
      togglePause: () => act(() => run.togglePause()), returnToMenu: () => act(() => run.returnToMenu()),
    });
    useHudStore.getState().setErrorMessage(null);
    this.publish();
  }

  update(_: number, delta: number) {
    if (!this.run || !this.inputController) return;
    const world = this.run.getWorld();
    if (world && world !== this.renderedWorld && world !== this.pendingWorld) void this.displayWorld(world);
    if (!world && this.renderedWorld) this.clearRenderer();
    if (!world && this.pendingWorld) {
      this.loadController?.abort();
      this.pendingWorld = null;
    }
    if (world && world === this.renderedWorld && this.worldRenderer && this.cameraModel) {
      this.run.update(delta, this.inputController.read());
      const state = world.getState();
      this.cameraModel.x = state.player.position.x;
      this.cameraModel.y = state.player.position.y;
      this.worldRenderer.render(state, Math.min(delta, 50));
      this.worldRenderer.applyCamera(this.cameraModel);
      if (state.combat.cameraShakePulse !== this.lastShake) {
        this.lastShake = state.combat.cameraShakePulse;
        this.cameras.main.shake(state.combat.cameraShakeMs, state.combat.cameraShakeIntensity);
      }
    }
    this.hudElapsed += delta;
    if (this.hudElapsed >= 80) { this.hudElapsed = 0; this.publish(); }
  }

  private async displayWorld(world: GameWorld) {
    const built = this.run?.getBuiltLevel();
    if (!built) return;
    this.clearRenderer();
    this.loadController?.abort();
    const controller = new AbortController();
    this.loadController = controller;
    this.pendingWorld = world;
    this.publish();
    try {
      await loadMapAssetsForScene(this, built.map, controller.signal);
      if (controller.signal.aborted || this.run?.getWorld() !== world) return;
      const state = world.getState();
      this.cameraModel = new Camera({ x: state.player.position.x, y: state.player.position.y, width: this.scale.width, height: this.scale.height,
        options: { bounds: { minX: 0, minY: 0, maxX: built.map.width, maxY: built.map.height } } });
      this.worldRenderer = new WorldRenderer(this);
      this.worldRenderer.initialize(built.map, state, this.cameraModel);
      this.renderedWorld = world;
      this.lastShake = 0;
    } catch (error) {
      if (!controller.signal.aborted && this.run?.getWorld() === world) this.run.failPresentation(error instanceof Error ? error.message : 'Не удалось загрузить графику');
    } finally {
      if (this.pendingWorld === world) this.pendingWorld = null;
      this.publish();
    }
  }

  private publish() {
    if (!this.run) return;
    const snapshot = this.run.getState();
    if (snapshot.phase === 'playing' && this.run.getWorld() !== this.renderedWorld) snapshot.phase = 'loading';
    useHudStore.getState().setRun(snapshot);
  }
  private pause = () => { this.run?.togglePause(); this.publish(); };
  private onBlur = () => { if (this.run?.getPhase() === 'playing' || this.run?.getPhase() === 'exploring') this.pause(); };
  private resize() {
    this.cameraModel?.setViewportSize(this.scale.width, this.scale.height);
    if (this.cameraModel) this.worldRenderer?.applyCamera(this.cameraModel);
  }
  private clearRenderer() {
    this.worldRenderer?.destroy();
    this.worldRenderer = null;
    this.renderedWorld = null;
    this.cameraModel = null;
  }
  private cleanup = () => {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.loadController?.abort();
    this.loadController = null;
    this.pendingWorld = null;
    this.run?.dispose();
    this.run = null;
    this.input.keyboard?.off('keydown-ESC', this.pause);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
    this.inputController?.destroy();
    this.inputController = null;
    this.clearRenderer();
    useHudStore.getState().setActions(null);
    useHudStore.getState().setRun(null);
  };
}
