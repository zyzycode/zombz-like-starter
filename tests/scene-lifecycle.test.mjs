import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { GameScene } from '../src/game/presentation/phaser/scenes/GameScene.ts';
import { pendingBuilds } from './fixtures/runtime.mjs';
import { useHudStore } from '../src/ui/hud/useHudStore.ts';

function createScene() {
  const scene = new GameScene();
  scene.input = new EventEmitter();
  scene.input.keyboard = { addKeys: () => ({}), removeKey() {} };
  scene.game = { registry: { get: () => 'test-level' } };
  scene.scale = new EventEmitter();
  return scene;
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('shutdown disposes resources once and disconnects input and resize', () => {
  const scene = createScene();
  scene.create();
  let destroyed = 0;
  scene.worldRenderer = { destroy: () => destroyed++ };
  scene.scale.on('resize', scene.handleResize);
  scene.events.emit('shutdown');
  scene.events.emit('destroy');
  assert.equal(destroyed, 1);
  assert.equal(scene.scale.listenerCount('resize'), 0);
  assert.equal(scene.input.listenerCount('pointermove'), 0);
  assert.equal(scene.input.listenerCount('pointerdown'), 0);
  assert.equal(scene.worldRenderer, null);
});

test('late build resolution after shutdown never initializes the old world', async () => {
  const scene = createScene();
  scene.create();
  const build = pendingBuilds.at(-1);
  scene.events.emit('shutdown');
  useHudStore.getState().setErrorMessage('current scene');
  build.resolve({ builtLevel: { map: { renderMode: 'tiled' } } });
  await flush();
  assert.equal(scene.world, null);
  assert.equal(useHudStore.getState().errorMessage, 'current scene');
});

test('a failed old build cannot overwrite the restarted scene HUD', async () => {
  const scene = createScene();
  scene.create();
  const oldBuild = pendingBuilds.at(-1);
  scene.events.emit('shutdown');
  scene.create();
  oldBuild.reject(new Error('old load failed'));
  await flush();
  assert.equal(useHudStore.getState().errorMessage, null);
  assert.equal(scene.events.listenerCount('shutdown'), 1);
  assert.equal(scene.events.listenerCount('destroy'), 1);
  scene.events.emit('shutdown');
});

test('shutdown during asset loading cancels the wait without reporting an error', async () => {
  const scene = createScene();
  scene.load = new EventEmitter();
  scene.load.spritesheet = () => {};
  scene.load.start = () => {};
  scene.textures = { exists: () => false };
  scene.create();
  pendingBuilds.at(-1).resolve({ builtLevel: { map: {
    renderMode: 'tiled', tileSize: { width: 16, height: 16 },
    tilesets: [{ imageKey: 'tiles', imagePath: '/tiles.png' }],
  } } });
  await flush();
  assert.equal(scene.load.listenerCount('complete'), 1);
  scene.events.emit('shutdown');
  await flush();
  assert.equal(scene.load.listenerCount('complete'), 0);
  assert.equal(scene.load.listenerCount('loaderror'), 0);
  assert.equal(scene.world, null);
  assert.equal(useHudStore.getState().errorMessage, null);
});

test('direct game destruction cancels a pending build without prior shutdown', async () => {
  const scene = createScene();
  scene.create();
  const build = pendingBuilds.at(-1);
  let destroyed = 0;
  scene.worldRenderer = { destroy: () => destroyed++ };
  scene.events.emit('destroy');
  build.reject(new Error('destroyed game load'));
  await flush();
  assert.equal(destroyed, 1);
  assert.equal(scene.worldRenderer, null);
  assert.equal(scene.events.listenerCount('shutdown'), 0);
  assert.equal(scene.input.listenerCount('pointermove'), 0);
  assert.equal(useHudStore.getState().errorMessage, null);
});
