import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NavigationGrid } from '../src/game/core/navigation/NavigationGrid.ts';
import { CollisionSystem } from '../src/game/core/systems/CollisionSystem.ts';
import { CollisionGrid } from '../src/game/world/collision/CollisionGrid.ts';
import { EnemyAiSystem } from '../src/game/core/systems/EnemyAiSystem.ts';
import { CombatResolver } from '../src/game/core/combat/CombatResolver.ts';
import { AbilitySystem } from '../src/game/core/combat/AbilitySystem.ts';
import { ProjectileSystem } from '../src/game/core/combat/ProjectileSystem.ts';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { createEnemy } from '../src/game/core/entities/createEnemy.ts';
import { RunSession } from '../src/game/core/world/RunSession.ts';
import { CAMPAIGN } from '../src/game/content/campaign/campaign.ts';
import { createCampaignLevel } from '../src/game/session/createCampaignLevel.ts';

const rect = (id, x, y, width, height) => ({ id, kind: 'rect', position: { x, y }, width, height });
function navigationFor(width, height, walls, options = {}) {
  const collisionGrid = new CollisionGrid(width, height, walls), collision = new CollisionSystem();
  const resolvePosition = (position, radius) => collision.resolveCharacterCollision({ position, radius, collisionGrid, destructibles: [], resourceNodes: [] });
  return { resolvePosition, navigation: new NavigationGrid({ width, height, resolvePosition, ...options }) };
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function followPath(navigation, resolvePosition, start, target, label) {
  let position = { ...start };
  for (let step = 0; step < 1200 && distance(position, target) > 2; step++) {
    const waypoint = navigation.getWaypoint(position, target);
    assert.ok(waypoint, `${label}: no path from ${JSON.stringify(position)}`);
    const length = distance(position, waypoint);
    assert.ok(length > .01, `${label}: stationary waypoint`);
    const factor = Math.min(1, 24 / length);
    const next = { x: position.x + (waypoint.x - position.x) * factor, y: position.y + (waypoint.y - position.y) * factor };
    assert.ok(distance(next, resolvePosition(next, 38)) < .01, `${label}: path cuts a wall`);
    position = next;
  }
  assert.ok(distance(position, target) <= 2, `${label}: path never reaches target`);
}

test('shared navigation takes enemies out of a U-shaped trap and ranged enemies do not fire through its walls', () => {
  const { navigation, resolvePosition } = navigationFor(768, 768, [
    rect('left', 128, 256, 64, 384), rect('right', 384, 256, 64, 384), rect('top', 256, 64, 320, 64),
  ]);
  const player = createPlayer(); player.position = { x: 576, y: 256 };
  const enemy = createEnemy('chaser', 256, 256);
  const ai = new EnemyAiSystem(), projectiles = new ProjectileSystem();
  assert.equal(navigation.hasLineOfSight(enemy.position, player.position), false);
  let maximumY = enemy.position.y;
  for (let frame = 0; frame < 1800 && distance(enemy.position, player.position) > 90; frame++) {
    ai.update({ enemies: [enemy], player: player.toState(), deltaMs: 16, projectiles, resolvePosition, navigation });
    maximumY = Math.max(maximumY, enemy.position.y);
    assert.ok(distance(enemy.position, resolvePosition(enemy.position, enemy.radius)) < .01);
  }
  assert.ok(maximumY > 480, 'enemy must go around the bottom of the U');
  assert.ok(distance(enemy.position, player.position) <= 90, 'enemy reaches player after detour');
  const ranged = createEnemy('archer', 256, 256, 'ranged');
  for (let frame = 0; frame < 40; frame++) ai.update({ enemies: [ranged], player: player.toState(), deltaMs: 16, projectiles, resolvePosition, navigation });
  assert.equal(navigation.hasLineOfSight(ranged.position, player.position), false);
  assert.equal(projectiles.getState().length, 0);
});

test('navigation rejects unreachable rooms and checks thin walls between clear grid centers', () => {
  const { navigation } = navigationFor(384, 384, [rect('divider', 192, 192, 2, 384)], { clearance: 8 });
  assert.equal(navigation.hasLineOfSight({ x: 160, y: 96 }, { x: 224, y: 96 }), false);
  assert.equal(navigation.getWaypoint({ x: 160, y: 96 }, { x: 224, y: 96 }), null);
  assert.deepEqual(navigation.getWaypoint({ x: 96, y: 96 }, { x: 96, y: 224 }), { x: 96, y: 224 });
});

test('central visibility blocks melee and magical control through walls, while plain resolver remains usable', () => {
  const { navigation } = navigationFor(512, 512, [rect('divider', 256, 256, 32, 512)]);
  const player = createPlayer(); player.position = { x: 192, y: 256 };
  const target = createEnemy('behind-wall', 320, 256);
  const attack = { sourceId: player.id, team: 'player', type: 'melee', damageType: 'physical', damage: 20,
    range: 0, radius: 200, direction: 'right', origin: { ...player.position }, knockback: 0, hitStopMs: 0 };
  const resolver = new CombatResolver(navigation.hasLineOfSight);
  assert.equal(resolver.resolveAttack(attack, [target]).hitCount, 0);
  const abilities = new AbilitySystem(resolver);
  player.setUnlockedAbilities(['iceRing']); player.setAbilityLoadout({ z: 'iceRing', x: null, c: null });
  abilities.update({ player, enemies: [target], projectiles: new ProjectileSystem(), input: {
    up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false,
    interactPressed: false, slotZPressed: true, aim: { ...target.position },
  } });
  assert.equal(target.hp, target.maxHp);
  assert.equal(target.stunRemainingMs, 0);
  assert.equal(new CombatResolver().resolveAttack(attack, [target]).hitCount, 1);
  assert.equal(target.hp, target.maxHp - 20);
});

test('three large authored mazes have traversable routes from spawn to every interaction and enemy marker', async () => {
  const stages = CAMPAIGN.map((stage, index) => ({ stage, depth: index + 1 })).filter(({ stage }) => stage.id.endsWith('-maze'));
  assert.equal(CAMPAIGN.length, 9);
  assert.equal(stages.length, 3);
  for (const { stage, depth } of stages) {
    const built = await createCampaignLevel(depth, new RunSession({ playerClassId: 'wanderer' }));
    const map = built.map;
    assert.ok(map.width >= 1920 && map.height >= 1408, `${stage.id}: large map dimensions`);
    assert.ok(map.collision.some(shape => shape.kind === 'rect'), `${stage.id}: physical walls`);
    const { navigation, resolvePosition } = navigationFor(map.width, map.height, map.collision);
    const start = built.initialState.player.position;
    const destinations = [...map.markers.filter(marker => marker.kind === 'enemy_spawn'),
      ...(map.obelisks ?? []), ...(map.caches ?? []), ...(map.restorationSites ?? [])];
    assert.ok(map.obelisks?.length >= 2 && map.caches?.length >= 1);
    for (const goal of destinations) followPath(navigation, resolvePosition, start, goal.position, `${stage.id}/${goal.id}`);
  }
});
