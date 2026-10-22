import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaveDirector } from '../src/game/core/waves/WaveDirector.ts';
import { RunSession } from '../src/game/core/world/RunSession.ts';

const wave = (waveIndex, delayMs = 0) => ({ waveIndex, delayMs, spawnBudget: 1, spawns: [{ archetypeId: 'grunt', count: 1 }] });

test('spawning the last wave does not mean it was cleared', () => {
  const director = new WaveDirector([wave(1)]);
  director.update(16, 0);
  assert.equal(director.isCompleted(), false);
  director.recordClearedWave(1);
  assert.equal(director.isCompleted(), false);
  director.recordClearedWave(0);
  assert.equal(director.isCompleted(), true);
  director.recordClearedWave(0);
  assert.equal(director.getClearedWaveCount(), 1);
});

test('wave identifiers do not skip entries; delay starts only after clearing', () => {
  const director = new WaveDirector([wave(10), wave(20, 100)]);
  assert.equal(director.update(1, 0).spawnedWave.waveIndex, 10);
  assert.equal(director.update(1000, 1).spawnedWave, null);
  assert.equal(director.update(99, 0).spawnedWave, null);
  assert.equal(director.update(1, 0).spawnedWave.waveIndex, 20);
  assert.equal(director.getClearedWaveCount(), 1);
  assert.equal(director.isCompleted(), false);
});

test('death during the first wave awards no cleared waves', () => {
  const session = new RunSession({ playerClassId: 'survivor' });
  session.setWaveIndex(1);
  assert.equal(session.complete('died').wavesCleared, 0);
});

test('completed sessions and result snapshots cannot be changed', () => {
  const session = new RunSession({ playerClassId: 'survivor' });
  session.recordEnemyKill();
  session.addCollectedResource('ore', 2);
  session.complete('extracted');
  const state = session.toState();
  const result = session.getResult();
  session.recordEnemyKill();
  session.addCollectedResource('ore', 5);
  session.setWaveIndex(2);
  session.setThreatLevel(20);
  session.tick(100);
  assert.deepEqual(session.toState(), state);
  result.resourceLedger.ore = 999;
  assert.equal(session.complete('died').resourceLedger.ore, 2);
  assert.equal(session.getResult().outcome, 'extracted');
});

import { LevelBuilder } from '../src/game/world/level/LevelBuilder.ts';
import { GameWorld } from '../src/game/core/world/GameWorld.ts';

async function worldFixture() {
  const runSession = new RunSession({ playerClassId: 'survivor' });
  const map = {
    id: 'test', width: 1000, height: 1000, collision: [],
    markers: [
      { id: 'start', kind: 'player_spawn', position: { x: 500, y: 500 } },
      { id: 'exit', kind: 'extraction_zone', position: { x: 500, y: 500 } },
      { id: 'enemies', kind: 'enemy_spawn', position: { x: 100, y: 100 } },
    ],
  };
  const level = {
    id: 'test', mapId: 'test', playerSpawn: { markerKind: 'player_spawn' },
    resourceSpawns: [], enemySpawners: [{ markerKind: 'enemy_spawn' }],
    extractionZones: [{ id: 'exit', marker: { markerKind: 'extraction_zone' }, radius: 50, channelDurationMs: 32, isActive: true }],
    rules: { waves: { enabled: true, table: [wave(1)] } },
  };
  const builtLevel = await new LevelBuilder({ getById: async () => map }, { getById: async () => level }).build({ levelId: 'test', runSession });
  const submitted = [];
  const world = new GameWorld({ builtLevel, runSession, runResultGateway: { submitRunResult: async (result) => submitted.push(result) } });
  return { world, submitted };
}
const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 500, y: 500 } };

test('extraction includes the final-frame kill and wave, submitting only once', async () => {
  const { world, submitted } = await worldFixture();
  world.update(16, idle);
  assert.equal(world.getState().runSession.wavesCleared, 0);
  // Combat has killed the final enemy; normal world cleanup must precede completion.
  world.enemies[0].hp = 0;
  world.update(16, idle);
  const result = world.getState().runResult;
  assert.equal(result.outcome, 'extracted');
  assert.equal(result.enemiesKilled, 1);
  assert.equal(result.wavesCleared, 1);
  world.update(16, idle);
  assert.equal(submitted.length, 1);
  assert.deepEqual(submitted[0], result);
});

test('death in an uncleared wave cannot become extraction success', async () => {
  const { world } = await worldFixture();
  world.update(16, idle);
  world.player.hp = 0;
  world.update(16, idle);
  assert.equal(world.getState().runResult.outcome, 'died');
  assert.equal(world.getState().runResult.wavesCleared, 0);
});
