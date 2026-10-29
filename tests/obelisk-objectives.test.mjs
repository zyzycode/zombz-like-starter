import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObeliskSystem } from '../src/game/core/environment/ObeliskSystem.ts';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { GameWorld } from '../src/game/core/world/GameWorld.ts';
import { RunSession } from '../src/game/core/world/RunSession.ts';
import { createCampaignLevel } from '../src/game/session/createCampaignLevel.ts';
import { RunController } from '../src/game/session/RunController.ts';
import { MetaProgression } from '../src/game/core/meta/MetaProgression.ts';
import { LocalMetaProfileRepository } from '../src/game/session/LocalMetaProfileRepository.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 800, y: 352 } };
const interact = { ...idle, interactPressed: true };
const obelisk = (id, x = 600, y = 352) => ({ id, position: { x, y }, radius: 32 });
const rune = (delay = 100000) => ({ id: 'rune', position: { x: 480, y: 352 }, radius: 100, damage: 1000,
  damageType: 'magic', cooldownMs: 1000, warningMs: 10, activeMs: 100, initialDelayMs: delay, theme: 'fire' });

async function objectiveLevel(depth, session, previousPlayer) {
  const built = await createCampaignLevel(depth, session, previousPlayer);
  built.map.obelisks = [obelisk(`level-${depth}-obelisk`)];
  built.map.hazards = [rune()];
  built.level.rules.waves.table = [{ waveIndex: 1, delayMs: 0, spawnBudget: 1, spawns: [{ archetypeId: 'grunt', count: 1 }] }];
  return built;
}
async function worldFixture() {
  const session = new RunSession({ playerClassId: 'wanderer' });
  const built = await objectiveLevel(1, session);
  return { session, built, makeWorld: () => new GameWorld({ builtLevel: built, runSession: session, mode: 'campaign', runResultGateway: { submitRunResult: async () => {} } }) };
}

test('obelisks require E, proximity and life; each press activates only the nearest unused objective', () => {
  const player = createPlayer(); player.position = { x: 0, y: 0 };
  const system = new ObeliskSystem([obelisk('far', 30, 0), obelisk('near', 10, 0)]);
  assert.equal(new ObeliskSystem([]).isComplete(), true);
  assert.equal(system.tryActivate(player, idle), false);
  player.position.x = 100; assert.equal(system.tryActivate(player, interact), false);
  player.position.x = 0; player.hp = 0; assert.equal(system.tryActivate(player, interact), false);
  player.hp = 100; assert.equal(system.tryActivate(player, interact), true);
  assert.deepEqual(system.getState().map(item => item.activated), [false, true]);
  assert.equal(system.isComplete(), false);
  const copy = system.getState(); copy[1].activated = false;
  assert.equal(system.getState()[1].activated, true);
  assert.equal(system.tryActivate(player, interact), true);
  assert.equal(system.tryActivate(player, interact), false);
  assert.equal(system.isComplete(), true);
});

test('one E press prioritizes obelisk over cache and spring, then each remaining interaction works', async () => {
  const { built, makeWorld } = await worldFixture();
  const spring = built.map.restorationSites[0];
  built.map.obelisks = [obelisk('overlap', spring.position.x, spring.position.y)];
  built.map.caches = [{ id: 'cache', position: { ...spring.position }, radius: 32 }];
  const world = makeWorld(); world.player.position = { ...spring.position }; world.player.hp = 20;
  world.update(0, interact);
  assert.equal(world.getState().obelisks[0].activated, true);
  assert.equal(world.getState().caches[0].opened, false);
  assert.equal(world.getState().restorationSites[0].used, false);
  assert.equal(world.player.hp, 20);
  world.update(0, interact);
  assert.equal(world.getState().caches[0].opened, true);
  assert.equal(world.getState().restorationSites[0].used, false);
  world.update(0, interact);
  assert.equal(world.getState().restorationSites[0].used, true);
});

test('uncleared objectives defer rewards, allow safe movement, then finish once and reset on the next level', async () => {
  const meta = new MetaProgression(new LocalMetaProfileRepository({ getItem: () => null, setItem() {} }));
  const run = new RunController(meta, objectiveLevel); await run.startRun(); run.update(16, idle);
  for (const enemy of run.getWorld().enemies) enemy.hp = 0;
  run.update(16, idle);
  const world = run.getWorld(), before = run.getState();
  assert.equal(before.world.status, 'securing'); assert.equal(before.phase, 'playing');
  assert.equal(before.clearedLevels, 0); assert.deepEqual(before.rewards, []); assert.equal(before.build.xp, 18);
  const player = world.player.toState(); player.hp = 50; player.abilities.mana = 20; player.abilities.fireboltCooldownMs = 1000;
  world.player.applyResolvedState(player); world.hitStopRemainingMs = 100;
  const frozen = world.getState();
  run.update(100, { ...idle, right: true, fireboltPressed: true, attackPressed: true, attackHeld: true, dodgePressed: true });
  assert.ok(world.player.position.x > frozen.player.position.x);
  assert.equal(world.player.hp, 50);
  assert.deepEqual(world.player.getAbilities(), frozen.player.abilities);
  assert.deepEqual(world.getState().hazards, frozen.hazards);
  assert.deepEqual(world.getState().projectiles, frozen.projectiles);
  run.togglePause(); run.update(100, interact); run.togglePause();
  assert.equal(world.getState().obelisks[0].activated, false);
  world.player.position = { ...world.getState().obelisks[0].position };
  run.update(16, interact);
  const completed = run.getState();
  assert.equal(completed.phase, 'reward'); assert.equal(completed.world.status, 'cleared');
  assert.equal(completed.clearedLevels, 1); assert.equal(completed.rewards.length, 3);
  run.update(100, interact); assert.deepEqual(run.getState().build, completed.build);
  await run.chooseReward(completed.rewards[0].id);
  assert.equal(run.getState().depth, 2);
  assert.ok(run.getState().world.obelisks.every(item => !item.activated));
});

test('objectives may be activated during combat; simultaneous lethal rune damage still defeats the run', async () => {
  const normal = await worldFixture(), world = normal.makeWorld();
  world.player.position = { ...world.getState().obelisks[0].position }; world.update(0, interact);
  assert.equal(world.getState().status, 'active', 'the living enemy still blocks completion');
  for (const enemy of world.enemies) enemy.hp = 0;
  world.update(16, idle); assert.equal(world.getState().status, 'cleared');

  const lethal = await worldFixture(); lethal.built.map.hazards = [rune(0)];
  const doomed = lethal.makeWorld();
  doomed.player.position = { ...doomed.getState().obelisks[0].position }; doomed.update(0, interact);
  doomed.player.position = { x: 480, y: 352 };
  for (const enemy of doomed.enemies) { enemy.position = { x: 480, y: 352 }; enemy.attack.runtime.cooldownRemainingMs = 99999; }
  doomed.update(16, idle);
  assert.equal(doomed.getState().status, 'dead');
  assert.equal(doomed.enemies.length, 0);
  assert.equal(doomed.getState().obelisks[0].activated, true);
});
