import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, getEventListeners } from 'node:events';
import { loadMapAssetsForScene } from '../src/game/presentation/phaser/loading/loadMapAssetsForScene.ts';

const map = { renderMode: 'tiled', tileSize: { width: 16, height: 16 }, tilesets: [{ imageKey: 'tiles', imagePath: '/tiles.png' }] };
function fixture() {
  const load = new EventEmitter();
  load.spritesheet = () => {};
  load.start = () => {};
  const controller = new AbortController();
  const scene = { load, textures: { exists: () => false } };
  return { load, controller, scene };
}
function assertClean(load, signal) {
  assert.equal(load.listenerCount('complete'), 0);
  assert.equal(load.listenerCount('loaderror'), 0);
  assert.equal(getEventListeners(signal, 'abort').length, 0);
}
for (const outcome of ['complete', 'loaderror', 'abort']) {
  test(`map loading settles and removes all listeners on ${outcome}`, async () => {
    const { load, controller, scene } = fixture();
    const pending = loadMapAssetsForScene(scene, map, controller.signal);
    const settled = outcome === 'complete' ? pending : assert.rejects(pending);
    if (outcome === 'abort') controller.abort();
    else load.emit(outcome);
    await settled;
    assertClean(load, controller.signal);
  });
}
test('an already aborted load queues no assets', async () => {
  const { scene, controller, load } = fixture();
  controller.abort();
  scene.load.spritesheet = () => assert.fail('queued after cancellation');
  await assert.rejects(loadMapAssetsForScene(scene, map, controller.signal));
  assertClean(load, controller.signal);
});
test('cached assets do not start the loader', async () => {
  const { scene, controller, load } = fixture();
  scene.textures.exists = () => true;
  load.start = () => assert.fail('started for cached textures');
  await loadMapAssetsForScene(scene, map, controller.signal);
  assertClean(load, controller.signal);
});
test('synchronous loader failures release listeners', async () => {
  const { scene, controller, load } = fixture();
  load.start = () => { throw new Error('loader unavailable'); };
  await assert.rejects(loadMapAssetsForScene(scene, map, controller.signal), /loader unavailable/);
  assertClean(load, controller.signal);
});
