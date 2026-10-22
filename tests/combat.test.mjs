import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { createEnemy } from '../src/game/core/entities/createEnemy.ts';
import { AttackController } from '../src/game/core/combat/AttackController.ts';
import { AbilitySystem } from '../src/game/core/combat/AbilitySystem.ts';
import { ProjectileSystem } from '../src/game/core/combat/ProjectileSystem.ts';
import { EnemyAiSystem } from '../src/game/core/systems/EnemyAiSystem.ts';

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
