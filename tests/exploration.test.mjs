import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CacheSystem } from '../src/game/core/environment/CacheSystem.ts';
import { RunBuild } from '../src/game/core/progression/RunBuild.ts';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { GameWorld } from '../src/game/core/world/GameWorld.ts';
import { RunSession } from '../src/game/core/world/RunSession.ts';
import { createCampaignLevel } from '../src/game/session/createCampaignLevel.ts';
import { RunController } from '../src/game/session/RunController.ts';
import { MetaProgression } from '../src/game/core/meta/MetaProgression.ts';
import { LocalMetaProfileRepository } from '../src/game/session/LocalMetaProfileRepository.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 800, y: 352 } };
const interact = { ...idle, interactPressed: true };
const cache = (id = 'cache', x = 0, y = 0) => ({ id, position: { x, y }, radius: 32 });

test('cache requires proximity and a living player, opens the nearest only once, and isolates snapshots', () => {
  const player = createPlayer(); player.position = { x: 0, y: 0 };
  const system = new CacheSystem([cache('far', 30), cache('near', 10)]);
  assert.equal(system.tryOpen(player, idle), null);
  player.position = { x: 100, y: 0 };
  assert.equal(system.tryOpen(player, interact), null);
  player.position = { x: 0, y: 0 }; player.hp = 0;
  assert.equal(system.tryOpen(player, interact), null);
  player.hp = 100;
  assert.equal(system.tryOpen(player, interact), 'near');
  const snapshot = system.getState();
  assert.deepEqual(snapshot.map(({ id, opened }) => ({ id, opened })), [
    { id: 'far', opened: false }, { id: 'near', opened: true },
  ]);
  snapshot[1].opened = false;
  assert.equal(system.getState()[1].opened, true);
  assert.equal(system.tryOpen(player, interact), 'far');
  assert.equal(system.tryOpen(player, interact), null);
});

test('cache loot is one-shot inventory loot, does not equip, and never consumes the pending level offer', () => {
  const build = new RunBuild({}, () => 0.5);
  const offer = build.createRewards(1), before = build.getState();
  const item = build.claimCache('grove-1-cache', 1);
  assert.ok(item);
  assert.equal(build.getState().inventory.length, 1);
  assert.deepEqual(build.getState().equipment, before.equipment);
  assert.deepEqual(build.getState().stats, before.stats);
  assert.deepEqual(build.createRewards(1), offer);
  assert.equal(build.claimCache('grove-1-cache', 1), null);
  assert.equal(build.getState().inventory.length, 1);
  assert.equal(build.claimReward(offer[0].id), true);
  assert.equal(build.getState().inventory.length, 2);
  assert.notEqual(item.id, offer[0].id);
  assert.ok(new RunBuild().claimCache('grove-1-cache', 1), 'new run has a fresh cache ledger');
});

test('a cache takes priority over an overlapping spring for one E press, and its event drains once', async () => {
  const session = new RunSession({ playerClassId: 'wanderer' });
  const built = await createCampaignLevel(1, session);
  const spring = built.map.restorationSites[0];
  built.map.caches = [cache('overlapping-cache', spring.position.x, spring.position.y)];
  const world = new GameWorld({ builtLevel: built, runSession: session, mode: 'campaign', runResultGateway: { submitRunResult: async () => {} } });
  world.player.position = { ...spring.position };
  world.player.hp = 20;
  world.update(0, interact);
  assert.equal(world.player.hp, 20);
  assert.equal(world.getState().restorationSites[0].used, false);
  assert.equal(world.getState().caches[0].opened, true);
  assert.deepEqual(world.drainOpenedCaches(), ['overlapping-cache']);
  assert.deepEqual(world.drainOpenedCaches(), []);
  world.update(0, interact);
  assert.ok(world.player.hp > 20);
  assert.equal(world.getState().restorationSites[0].used, true);
  assert.deepEqual(world.drainOpenedCaches(), []);
});

async function explorationLevel(depth, session, previousPlayer) {
  const built = await createCampaignLevel(depth, session, previousPlayer);
  built.map.caches = [cache(`level-${depth}-cache`, 600, 352)];
  built.map.hazards = [{ id: 'frozen-rune', position: { x: 480, y: 352 }, radius: 100,
    damage: 99, damageType: 'magic', cooldownMs: 1000, warningMs: 1000,
    activeMs: 300, initialDelayMs: 100000, theme: 'fire' }];
  built.level.rules.waves.table = [{ waveIndex: 1, delayMs: 0, spawnBudget: 1, spawns: [{ archetypeId: 'grunt', count: 1 }] }];
  return built;
}

test('post-clear exploration retains the world and offer, freezes combat, awards caches and carries inventory forward', async () => {
  const meta = new MetaProgression(new LocalMetaProfileRepository({ getItem: () => null, setItem() {} }));
  const run = new RunController(meta, explorationLevel);
  await run.startRun();
  run.exploreArena(); assert.equal(run.getPhase(), 'playing', 'cannot explore an uncleared arena');
  run.update(16, idle);
  for (const enemy of run.getWorld().enemies) enemy.hp = 0;
  run.update(16, idle);
  assert.equal(run.getPhase(), 'reward');
  const before = run.getState(), world = run.getWorld();
  const player = world.player.toState(); player.hp = 50;
  player.abilities.mana = 20; player.abilities.fireboltCooldownMs = 1000;
  world.player.applyResolvedState(player); world.setUnlockedAbilities(['whirlwind', 'frostWave', 'mend']);
  const combatBefore = world.getState();
  run.exploreArena(); assert.equal(run.getPhase(), 'exploring');
  run.update(100, { ...idle, right: true, attackPressed: true, attackHeld: true, fireboltPressed: true, novaPressed: true, shieldBashPressed: true, whirlwindPressed: true, frostWavePressed: true, mendPressed: true });
  assert.equal(run.getWorld(), world);
  assert.ok(world.player.position.x > combatBefore.player.position.x);
  assert.equal(world.player.hp, 50);
  assert.deepEqual(world.player.getAbilities(), combatBefore.player.abilities);
  assert.deepEqual(world.getState().hazards, combatBefore.hazards);
  assert.deepEqual(world.getState().projectiles, combatBefore.projectiles);
  assert.equal(world.getState().status, 'cleared');
  world.player.position = { ...world.getState().caches[0].position };
  run.update(16, interact);
  const found = run.getState();
  assert.equal(found.build.inventory.length, 1);
  assert.equal(found.lastCacheItem.id, found.build.inventory[0].id);
  assert.deepEqual(found.build.equipment, {});
  run.finishExploration(); assert.equal(run.getPhase(), 'reward');
  assert.deepEqual(run.getState().rewards, before.rewards);
  assert.equal(run.getState().clearedLevels, before.clearedLevels);
  assert.equal(run.getState().build.xp, before.build.xp);
  assert.equal(run.getState().build.level, before.build.level);
  run.exploreArena(); run.update(16, interact); run.finishExploration();
  assert.equal(run.getState().build.inventory.length, 1);
  await run.chooseReward(before.rewards[0].id);
  const next = run.getState();
  assert.equal(next.depth, 2);
  assert.equal(next.world.runSession.runId, before.world.runSession.runId);
  assert.ok(next.build.inventory.some(item => item.id === found.lastCacheItem.id));
  assert.equal(next.build.inventory.length, 2);
  assert.ok(next.world.caches.every(item => !item.opened));
  assert.equal(next.lastCacheItem, null);
});
