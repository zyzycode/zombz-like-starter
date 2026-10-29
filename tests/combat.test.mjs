import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { createEnemy } from '../src/game/core/entities/createEnemy.ts';
import { AttackController } from '../src/game/core/combat/AttackController.ts';
import { AbilitySystem } from '../src/game/core/combat/AbilitySystem.ts';
import { ProjectileSystem } from '../src/game/core/combat/ProjectileSystem.ts';
import { EnemyAiSystem } from '../src/game/core/systems/EnemyAiSystem.ts';
import { DIRECTIONS, directionToVector, vectorToDirection } from '../src/game/core/math/directions.ts';
import { CollisionSystem } from '../src/game/core/systems/CollisionSystem.ts';
import { CollisionGrid } from '../src/game/world/collision/CollisionGrid.ts';
import { createArenaMap } from '../src/game/content/campaign/createArenaMap.ts';
import { CAMPAIGN } from '../src/game/content/campaign/campaign.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 1200, y: 540 } };
const resolvePosition = (position) => position;
const update = (player, input, deltaMs = 16) => player.update({ input: { ...idle, ...input }, deltaMs, attackController: new AttackController(), onHit() {}, resolvePosition });

test('spells consume mana once per cooldown and reject unaffordable casts', () => {
  const player = createPlayer();
  const system = new AbilitySystem();
  const projectiles = new ProjectileSystem();
  const cast = (input) => system.update({ player, input: { ...idle, ...input }, enemies: [], projectiles });
  cast({ fireboltPressed: true });
  assert.equal(player.getAbilities().mana, 80);
  cast({ fireboltPressed: true });
  assert.equal(player.getAbilities().mana, 80);
  assert.equal(projectiles.getState().length, 1);
  cast({ novaPressed: true });
  assert.equal(player.getAbilities().mana, 40);
  assert.equal(player.getAbilities().novaPulse, 1);
  update(player, {}, 550);
  cast({ fireboltPressed: true });
  update(player, {}, 550);
  cast({ fireboltPressed: true });
  update(player, {}, 550);
  const mana = player.getAbilities().mana;
  cast({ fireboltPressed: true });
  assert.equal(player.getAbilities().mana, mana);
});

test('dodge grants temporary immunity then expires, and diagonal movement is normalized', () => {
  const player = createPlayer();
  update(player, { dodgePressed: true, right: true });
  player.applyDamage(50, 'physical');
  assert.equal(player.hp, 100);
  update(player, {}, 200);
  player.applyDamage(50, 'magic');
  assert.equal(player.hp, 50);
  const diagonal = createPlayer();
  const origin = { ...diagonal.position };
  update(diagonal, { right: true, down: true }, 100);
  assert.ok(Math.abs(Math.hypot(diagonal.position.x - origin.x, diagonal.position.y - origin.y) - 28) < 0.001);
});

test('fast projectiles hit nearest hostile once, including a long frame', () => {
  const player = createPlayer();
  player.position = { x: 0, y: 0 };
  const near = createEnemy('near', 50, 0);
  const far = createEnemy('far', 100, 0);
  const system = new ProjectileSystem();
  system.spawn({ sourceId: player.id, team: 'player', position: { x: 0, y: 0 }, velocity: { x: 1000, y: 0 }, radius: 5, damage: 30, ttlMs: 1000, color: 0xffffff });
  system.update(200, [player, far, near]);
  assert.equal(near.hp, 70);
  assert.equal(far.hp, 100);
  assert.equal(player.hp, 100);
  assert.equal(system.getState().length, 0);
});

test('nova damages enemies around the player and ranged enemies actually shoot', () => {
  const player = createPlayer();
  const enemy = createEnemy('target', player.position.x - 70, player.position.y);
  const projectiles = new ProjectileSystem();
  new AbilitySystem().update({ player, input: { ...idle, novaPressed: true }, enemies: [enemy], projectiles });
  assert.equal(enemy.hp, 0);
  const ranged = createEnemy('archer', player.position.x - 260, player.position.y, 'ranged');
  new EnemyAiSystem().update({ enemies: [ranged], player: player.toState(), deltaMs: 650, resolvePosition, projectiles });
  assert.equal(projectiles.getState().length, 1);
  assert.equal(projectiles.getState()[0].team, 'enemy');
});

import { CombatResolver } from '../src/game/core/combat/CombatResolver.ts';
import { SeparationSystem } from '../src/game/core/systems/SeparationSystem.ts';

test('melee enemies reach an idle player diagonally before beginning their attack', () => {
  for (const archetype of ['grunt', 'runner', 'brute', 'boss']) {
    const player = createPlayer();
    const enemy = createEnemy(`diagonal-${archetype}`, player.position.x - 140, player.position.y - 140, archetype);
    const ai = new EnemyAiSystem();
    const resolver = new CombatResolver();
    const separation = new SeparationSystem();
    for (let frame = 0; frame < 300 && player.hp === player.maxHp; frame++) {
      update(player, {}, 16);
      const hits = ai.update({ enemies: [enemy], player: player.toState(), deltaMs: 16, resolvePosition });
      separation.separate({ units: [player, enemy], resolvePosition });
      for (const hit of hits) resolver.resolveAttack(hit, [player]);
    }
    assert.ok(player.hp < player.maxHp, `${archetype} must actually hit a stationary diagonal target`);
  }
});

test('eight directions have equal reach and sweeps hit in front without hitting behind', () => {
  const resolver = new CombatResolver();
  for (const direction of DIRECTIONS) {
    const facing = directionToVector(direction);
    assert.ok(Math.abs(Math.hypot(facing.x, facing.y) - 1) < .000001, direction);
    assert.equal(vectorToDirection(facing.x, facing.y), direction);
    const player = createPlayer();
    player.position = { x: 300, y: 300 };
    player.direction = direction;
    const front = createEnemy('front', 300 + facing.x * 50, 300 + facing.y * 50);
    const rear = createEnemy('rear', 300 - facing.x * 50, 300 - facing.y * 50);
    const controller = new AttackController();
    const { hit } = controller.update(player, 120, true);
    resolver.resolveAttack(hit, [front, rear]);
    assert.equal(front.hp, 50, `${direction}: swing hits the target in front`);
    assert.equal(rear.hp, 100, `${direction}: swing cannot hit behind the actor`);
  }
  assert.equal(vectorToDirection(0, 0), null);
  assert.equal(vectorToDirection(1, -.8), 'up-right');
  assert.equal(vectorToDirection(1, -.2), 'right');
});

test('walking faces movement but a requested attack aims at the cursor and stays locked', () => {
  const player = createPlayer();
  update(player, { right: true, down: true, aim: { x: 0, y: 0 } });
  assert.equal(player.direction, 'down-right', 'walking uses its actual direction rather than the cursor');
  const hits = [];
  const controller = new AttackController();
  const actorUpdate = (deltaMs, input) => player.update({
    input: { ...idle, ...input }, deltaMs, attackController: controller,
    onHit: (hit) => hits.push(hit), resolvePosition,
  });
  actorUpdate(16, { attackPressed: true, aim: { x: player.position.x + 100, y: player.position.y - 100 } });
  assert.equal(player.direction, 'up-right');
  actorUpdate(120, { left: true, aim: { x: player.position.x - 100, y: player.position.y + 100 } });
  assert.equal(player.direction, 'up-right');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].direction, 'up-right');
  actorUpdate(100, { attackHeld: true, aim: { x: 0, y: 0 } });
  assert.equal(hits.length, 1, 'the active window resolves only once');
});

test('a diagonal swing resolves once with the same damage at 16 ms and 100 ms steps', () => {
  const simulate = (step) => {
    const player = createPlayer();
    player.position = { x: 300, y: 300 };
    player.direction = 'down-right';
    const enemy = createEnemy('target', 335, 335);
    const controller = new AttackController();
    const resolver = new CombatResolver();
    controller.update(player, 0, true);
    let hits = 0;
    for (let elapsed = 0; elapsed < 400; elapsed += Math.min(step, 400 - elapsed)) {
      const result = controller.update(player, Math.min(step, 400 - elapsed), false);
      if (result.hit) { hits += 1; resolver.resolveAttack(result.hit, [enemy]); }
    }
    return { hp: enemy.hp, hits };
  };
  assert.deepEqual(simulate(16), { hp: 50, hits: 1 });
  assert.deepEqual(simulate(100), simulate(16));
});

test('a pursuing enemy routes around a circular cover island and reaches the player', () => {
  const player = createPlayer();
  player.position = { x: 700, y: 350 };
  const enemy = createEnemy('detour-grunt', 300, 350);
  const collisionGrid = new CollisionGrid(1000, 700, [
    { id: 'island', kind: 'circle', position: { x: 500, y: 350 }, radius: 55 },
  ]);
  const collision = new CollisionSystem();
  const resolve = (position, radius) => collision.resolveCharacterCollision({
    position, radius, collisionGrid, destructibles: [], resourceNodes: [],
  });
  const ai = new EnemyAiSystem();
  const resolver = new CombatResolver();
  let maxDetour = 0;
  for (let frame = 0; frame < 600 && player.hp === player.maxHp; frame++) {
    const hits = ai.update({ enemies: [enemy], player: player.toState(), deltaMs: 16, resolvePosition: resolve });
    maxDetour = Math.max(maxDetour, Math.abs(enemy.position.y - 350));
    for (const hit of hits) resolver.resolveAttack(hit, [player]);
  }
  assert.ok(maxDetour > 55, 'enemy must actually go around the obstacle');
  assert.ok(player.hp < player.maxHp, 'enemy must reach and hit its target instead of stalling at cover');
});

test('dodging cancels a sword windup without refunding cooldown or dealing delayed damage', () => {
  const player = createPlayer();
  const controller = new AttackController();
  const hits = [];
  const step = (deltaMs, input) => player.update({
    input: { ...idle, ...input }, deltaMs, attackController: controller,
    onHit: (hit) => hits.push(hit), resolvePosition,
  });
  step(16, { attackPressed: true });
  assert.equal(player.attack.runtime.phase, 'windup');
  const attackCooldown = player.attack.runtime.cooldownRemainingMs;
  step(16, { dodgePressed: true, right: true, down: true });
  assert.equal(player.attack.runtime.isActive, false);
  assert.equal(player.attack.runtime.cooldownRemainingMs, attackCooldown, 'dodge must not refund attack cooldown');
  assert.equal(player.direction, 'down-right', 'dodge animation faces its real movement');
  step(200, {});
  assert.equal(player.getAbilities().dodgeRemainingMs, 0);
  assert.ok(player.attack.runtime.cooldownRemainingMs > 0);
  step(400, {});
  assert.equal(hits.length, 0, 'the cancelled attack must never resume after the dodge');
});

test('the first arena grunt escapes clustered camp cover and reaches a stationary player', () => {
  const map = createArenaMap(CAMPAIGN[0], 1);
  const player = createPlayer();
  player.position = { ...map.markers.find((marker) => marker.kind === 'player_spawn').position };
  const spawn = map.markers.find((marker) => marker.kind === 'enemy_spawn');
  const enemy = createEnemy('wave-1-enemy-0', spawn.position.x, spawn.position.y);
  const collisionGrid = new CollisionGrid(map.width, map.height, map.collision);
  const collision = new CollisionSystem();
  const resolve = (position, radius) => collision.resolveCharacterCollision({
    position, radius, collisionGrid, destructibles: [], resourceNodes: [],
  });
  const ai = new EnemyAiSystem();
  const resolver = new CombatResolver();
  for (let frame = 0; frame < 1250 && player.hp === player.maxHp; frame++) {
    const hits = ai.update({ enemies: [enemy], player: player.toState(), deltaMs: 16, resolvePosition: resolve });
    for (const hit of hits) resolver.resolveAttack(hit, [player]);
  }
  assert.ok(player.hp < player.maxHp, 'a camp prop cluster must not trap the last enemy and stall the wave');
});
