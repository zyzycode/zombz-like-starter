import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { RestorationSystem } from '../src/game/core/environment/RestorationSystem.ts';
import { GameWorld } from '../src/game/core/world/GameWorld.ts';
import { RunSession } from '../src/game/core/world/RunSession.ts';
import { createCampaignLevel } from '../src/game/session/createCampaignLevel.ts';
import { CAMPAIGN } from '../src/game/content/campaign/campaign.ts';
import { createArenaMap } from '../src/game/content/campaign/createArenaMap.ts';
import { CollisionSystem } from '../src/game/core/systems/CollisionSystem.ts';
import { CollisionGrid } from '../src/game/world/collision/CollisionGrid.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 0, y: 0 } };
const interact = { ...idle, interactPressed: true };
const site = (id = 'spring', x = 0) => ({ id, position: { x, y: 0 }, radius: 32, healthFraction: 0.4, manaFraction: 0.5, used: false });

function woundedPlayer() {
  const player = createPlayer();
  const state = player.toState();
  state.hp = 10;
  state.abilities.mana = 20;
  player.applyResolvedState(state);
  player.position = { x: 0, y: 0 };
  return player;
}

test('restoration requires E and proximity, restores both resources, and works once', () => {
  const player = woundedPlayer();
  const system = new RestorationSystem([site()]);
  system.update(player, idle);
  assert.equal(player.hp, 10);
  assert.equal(system.getState()[0].used, false);

  player.position.x = 49; // Radius 32 + player radius 16: just outside reach.
  system.update(player, interact);
  assert.equal(player.hp, 10);
  assert.equal(system.getState()[0].used, false);

  player.position.x = 48;
  system.update(player, interact);
  assert.equal(player.hp, 50);
  assert.equal(player.getAbilities().mana, 70);
  assert.equal(system.getState()[0].used, true);
  system.update(player, interact);
  assert.equal(player.hp, 50);
  assert.equal(player.getAbilities().mana, 70);
});

test('full resources preserve a spring, while either missing resource can consume it', () => {
  const player = createPlayer();
  player.position = { x: 0, y: 0 };
  const system = new RestorationSystem([site()]);
  system.update(player, interact);
  assert.equal(system.getState()[0].used, false);

  assert.equal(player.cast('firebolt'), true);
  system.update(player, interact);
  assert.equal(player.hp, player.maxHp);
  assert.equal(player.getAbilities().mana, 100, 'mana restoration must stop at the maximum');
  assert.equal(system.getState()[0].used, true);

  const healthOnly = new RestorationSystem([site()]);
  player.hp = 95;
  healthOnly.update(player, interact);
  assert.equal(player.hp, player.maxHp, 'health restoration must stop at the maximum');
  assert.equal(healthOnly.getState()[0].used, true);
});

test('one press consumes only the nearest unused spring and cannot revive a dead player', () => {
  const player = woundedPlayer();
  const system = new RestorationSystem([site('far', 30), site('near', 10)]);
  system.update(player, interact);
  assert.deepEqual(system.getState().map(({ id, used }) => ({ id, used })), [
    { id: 'far', used: false }, { id: 'near', used: true },
  ]);
  system.update(player, interact);
  assert.equal(system.getState()[0].used, true);

  const dead = woundedPlayer();
  dead.hp = 0;
  const untouched = new RestorationSystem([site()]);
  untouched.update(dead, interact);
  assert.equal(dead.hp, 0);
  assert.equal(dead.getAbilities().mana, 20);
  assert.equal(untouched.getState()[0].used, false);
});

test('campaign level replacement preserves restored resources and run identity but creates fresh springs', async () => {
  const session = new RunSession({ runId: 'environment-run', playerClassId: 'wanderer' });
  const built = await createCampaignLevel(1, session);
  assert.ok(built.initialState.restorationSites.length > 0, 'campaign arenas must contain restoration sites');
  const world = new GameWorld({ builtLevel: built, runSession: session, mode: 'campaign', runResultGateway: { submitRunResult: async () => {} } });
  const source = world.getState().restorationSites[0];
  world.player.position = { ...source.position };
  const wounded = world.player.toState();
  wounded.hp = 10;
  wounded.abilities.mana = 20;
  world.player.applyResolvedState(wounded);
  const ledgerBefore = session.toState().resourceLedger;
  world.update(0, interact);
  const restored = world.getState();
  assert.equal(restored.restorationSites[0].used, true);
  assert.equal(built.initialState.restorationSites[0].used, false, 'runtime use must not mutate level content');
  assert.deepEqual(session.toState().resourceLedger, ledgerBefore);

  const next = await createCampaignLevel(2, session, restored.player);
  assert.equal(next.initialState.runSession.runId, 'environment-run');
  assert.equal(next.initialState.player.hp, restored.player.hp);
  assert.equal(next.initialState.player.abilities.mana, restored.player.abilities.mana);
  assert.ok(next.initialState.restorationSites.length > 0);
  assert.ok(next.initialState.restorationSites.every((spring) => !spring.used));
  assert.equal(world.getState().restorationSites[0].used, true);
});

// Check the same static collision model used by actual movement, ignoring visual props.
function arenaTraversal(map, start, radius = 30) {
  const collision = new CollisionSystem();
  const collisionGrid = new CollisionGrid(map.width, map.height, map.collision);
  const safe = (position) => {
    const resolved = collision.resolveCharacterCollision({ position, radius, collisionGrid, destructibles: [], resourceNodes: [] });
    return Math.hypot(resolved.x - position.x, resolved.y - position.y) < 0.00001;
  };
  const clearSegment = (from, to) => {
    const samples = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4);
    for (let index = 0; index <= samples; index++) {
      const t = samples ? index / samples : 0;
      if (!safe({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })) return false;
    }
    return true;
  };
  const step = 16;
  const key = (x, y) => `${x},${y}`;
  const nodes = new Map();
  for (let y = step * 2; y <= map.height - radius; y += step) {
    for (let x = step * 2; x <= map.width - radius; x += step) {
      if (safe({ x, y })) nodes.set(key(x, y), { x, y });
    }
  }
  const nearby = (point) => [...nodes.values()].filter((node) => Math.hypot(node.x - point.x, node.y - point.y) <= step * Math.SQRT2 && clearSegment(point, node));
  const queue = nearby(start);
  const reached = new Set(queue.map(({ x, y }) => key(x, y)));
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const node = queue[cursor];
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nextKey = key(node.x + dx, node.y + dy);
      const next = nodes.get(nextKey);
      if (next && !reached.has(nextKey) && clearSegment(node, next)) {
        reached.add(nextKey);
        queue.push(next);
      }
    }
  }
  return { safe, reachable: (point) => nearby(point).some(({ x, y }) => reached.has(key(x, y))) };
}

test('all six arenas keep boss-sized spawn jitter and restoration sites connected to the player', () => {
  for (const [index, stage] of CAMPAIGN.entries()) {
    const map = createArenaMap(stage, index + 1);
    const player = map.markers.find((marker) => marker.kind === 'player_spawn');
    assert.ok(player, `${stage.id}: player spawn required`);
    const traversal = arenaTraversal(map, player.position);
    assert.ok(traversal.safe(player.position), `${stage.id}: player spawn overlaps static collision for radius 30`);
    assert.ok(traversal.reachable(player.position), `${stage.id}: player cannot enter traversal grid`);
    const targets = (map.restorationSites ?? []).map((spring) => ({ label: `spring ${spring.id}`, position: spring.position }));
    const spawns = map.markers.filter((marker) => marker.kind === 'enemy_spawn');
    assert.ok(spawns.length > 0, `${stage.id}: enemy spawns required`);
    for (const spawn of spawns) {
      for (const dx of [-57.2, 0, 57.2]) {
        for (const dy of [-57.2, 0, 57.2]) {
          targets.push({ label: `${spawn.id} jitter (${dx}, ${dy})`, position: {
            x: Math.max(80, Math.min(map.width - 80, spawn.position.x + dx)),
            y: Math.max(80, Math.min(map.height - 80, spawn.position.y + dy)),
          } });
        }
      }
    }
    for (const { label, position } of targets) {
      assert.ok(traversal.safe(position), `${stage.id}: ${label} overlaps static collision for radius 30`);
      assert.ok(traversal.reachable(position), `${stage.id}: ${label} has no radius-30 path from player`);
    }
  }
});
